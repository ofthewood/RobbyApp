import time
import json
import logging
from typing import List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import TV_PORT, TV_HOST, TV_WEBHOOK_SECRET
from .models import TVWebhookPayload, AlertRule
from .storage import TVStateStore
from .alerting import AlertEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("tv_service.server")

app = FastAPI(
    title="TradingView Indicator Acquisition Microservice",
    description="Ingests multi-timeframe TradingView indicators, evaluates alerting, and streams to dashboard.",
    version="1.0.0"
)

# Enable CORS for local app interaction (port 8010 -> 8020)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core singletons
store = TVStateStore()
alert_engine = AlertEngine(store)

# Connected WebSocket clients set
active_connections: Set[WebSocket] = set()

# Broadcast helper
async def broadcast_ws(message: dict):
    if not active_connections:
        return
    dead = set()
    for ws in active_connections:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    for ws in dead:
        active_connections.discard(ws)


@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 TradingView Acquisition Service running on http://{TV_HOST}:{TV_PORT}")
    logger.info(f"🔑 Secret token required: {TV_WEBHOOK_SECRET[:4]}****")


@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "TradingView Acquisition Microservice",
        "timestamp": time.time(),
        "active_ws_clients": len(active_connections),
        "tracked_symbols": store.symbols,
        "tracked_timeframes": store.timeframes,
        "active_rules_count": len(alert_engine.rules)
    }


@app.post("/api/v1/webhook")
async def tv_webhook(
    request: Request,
    payload: TVWebhookPayload,
    x_webhook_secret: str = Header(None),
    secret: str = Query(None)
):
    """
    Primary ingestion endpoint for TradingView Webhook alerts.
    Validates token, updates memory store, evaluates alert triggers, and broadcasts live.
    """
    # 1. Verify Authentication Token
    provided_secret = payload.secret or x_webhook_secret or secret
    if not provided_secret or provided_secret != TV_WEBHOOK_SECRET:
        logger.warning(f"Unauthorized webhook attempt from {request.client.host if request.client else 'unknown'}")
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    # 2. Extract updates (supports single TF or multi-timeframe batch)
    updates = payload.extract_timeframe_updates()
    if not updates:
        return {"status": "ignored", "reason": "No valid timeframe data found"}

    processed_cells = []
    all_triggered_alerts = []

    for sym, tf, ts, metrics in updates:
        # Update state in storage
        prev_data = store.update_cell(sym, tf, ts, metrics)

        # Evaluate alerting rules
        triggered = alert_engine.evaluate(sym, tf, metrics, prev_data)
        if triggered:
            all_triggered_alerts.extend([a.dict() for a in triggered])

        bias = store._evaluate_cell_bias(metrics)
        cell_info = {
            "symbol": sym,
            "tf": tf,
            "updated_at": ts,
            "data": metrics,
            "bias": bias,
            "metric_count": len(metrics)
        }
        processed_cells.append(cell_info)

    # 3. Live WebSocket broadcast
    ws_msg = {
        "type": "tv_update",
        "timestamp": time.time(),
        "updates": processed_cells,
        "alerts": all_triggered_alerts
    }
    await broadcast_ws(ws_msg)

    return {
        "status": "success",
        "processed_count": len(processed_cells),
        "alerts_triggered": len(all_triggered_alerts)
    }


@app.get("/api/v1/matrix")
async def get_matrix():
    """Returns full 6x10 matrix snapshot."""
    return store.get_matrix_snapshot()


@app.get("/api/v1/matrix/{symbol}/{tf}")
async def get_cell_detail(symbol: str, tf: str):
    """Returns detailed indicators and recent rolling history for a single cell."""
    sym = symbol.upper()
    cell = store.matrix.get(sym, {}).get(tf)
    if not cell:
        raise HTTPException(status_code=404, detail="Symbol or timeframe not found")

    return {
        "symbol": sym,
        "tf": tf,
        "updated_at": cell.get("updated_at", 0),
        "data": cell.get("data", {}),
        "history": list(cell.get("history", []))
    }


@app.get("/api/v1/alerts")
async def get_alerts(limit: int = 50):
    """Returns recently triggered alerts."""
    return store.get_recent_alerts(limit=limit)


@app.delete("/api/v1/alerts")
async def clear_alerts():
    """Clears alerts history."""
    store.clear_alerts()
    await broadcast_ws({"type": "alerts_cleared"})
    return {"status": "cleared"}


@app.get("/api/v1/rules")
async def list_rules():
    """Lists all configured alerting rules."""
    return alert_engine.get_rules()


@app.post("/api/v1/rules")
async def create_or_update_rule(rule: AlertRule):
    """Adds or updates an alerting rule."""
    alert_engine.add_rule(rule)
    return {"status": "success", "rule": rule}


@app.delete("/api/v1/rules/{rule_id}")
async def delete_rule(rule_id: str):
    """Deletes an alerting rule."""
    alert_engine.remove_rule(rule_id)
    return {"status": "deleted", "rule_id": rule_id}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Live streaming WebSocket connection for Dashboard and sound alerting."""
    await websocket.accept()
    active_connections.add(websocket)
    try:
        # Send initial full matrix snapshot immediately upon connection
        await websocket.send_json({
            "type": "initial_snapshot",
            "snapshot": store.get_matrix_snapshot(),
            "recent_alerts": store.get_recent_alerts(limit=20)
        })

        # Keep alive loop
        while True:
            data = await websocket.receive_text()
            # If client sends ping, respond with pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        active_connections.discard(websocket)
    except Exception as e:
        logger.error(f"WebSocket client error: {e}")
        active_connections.discard(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.tv_service.server:app", host=TV_HOST, port=TV_PORT, reload=False)
