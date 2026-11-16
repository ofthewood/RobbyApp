import time
import json
import logging
import uuid
import io
import csv
import os
import asyncio
from collections import deque
from datetime import datetime
from typing import List, Set, Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, FileResponse
from pydantic import BaseModel

from .config import TV_PORT, TV_HOST, TV_WEBHOOK_SECRET, RETENTION_DAYS
from .models import TVWebhookPayload, AlertRule
from .storage import TVStateStore
from .alerting import AlertEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("tv_service.server")

# Tracing & Activity log buffers (in-memory)
recent_requests: deque = deque(maxlen=200)
request_stats = {
    "total_requests": 0,
    "success_count": 0,
    "error_count": 0,
    "alerts_count": 0,
    "last_request_time": None
}

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


async def periodic_purge_task(interval_seconds: int = 3600, days: int = RETENTION_DAYS):
    """Periodically runs rolling purge in background (every hour)."""
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            store.purge_old_data(days=days)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic purge task: {e}")


@app.on_event("startup")
async def startup_event():
    # Preload recent requests from SQLite tv_requests
    try:
        saved_reqs = store.get_recent_stored_requests(limit=100)
        for r in reversed(saved_reqs):
            recent_requests.appendleft(r)
        total_stored = store.get_total_requests_count()
        if total_stored > 0:
            request_stats["total_requests"] = total_stored
        if saved_reqs:
            request_stats["last_request_time"] = saved_reqs[0].get("time_str")
    except Exception as e:
        logger.error(f"Error restoring requests on startup: {e}")

    # Launch background periodic purge (1h interval, 5 days retention)
    asyncio.create_task(periodic_purge_task(interval_seconds=3600, days=RETENTION_DAYS))

    logger.info(f"🚀 TradingView Acquisition Service running on http://{TV_HOST}:{TV_PORT}")
    logger.info(f"🔑 Secret token required: {TV_WEBHOOK_SECRET[:4]}****")
    logger.info(f"🛡️ Rolling retention purge active: {RETENTION_DAYS} days")


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


@app.get("/api/v1/webhook")
@app.get("/api/webhook")
@app.get("/webhook")
async def tv_webhook_get():
    """Friendly status check when accessed from a web browser (GET)."""
    return {
        "status": "online",
        "service": "TradingView Webhook Receiver",
        "expected_method": "POST",
        "message": "Le point de terminaison webhook est actif et prêt à recevoir les requêtes POST de TradingView.",
        "tracked_symbols": store.symbols,
        "tracked_timeframes": store.timeframes
    }


@app.post("/api/v1/webhook")
@app.post("/api/webhook")
@app.post("/webhook")
async def tv_webhook(
    request: Request,
    payload: TVWebhookPayload
):
    """
    Primary ingestion endpoint for TradingView Webhook alerts.
    Open without token verification. Updates memory store, evaluates alert triggers, and broadcasts live.
    Traces every incoming request for monitoring.
    """
    t0 = time.time()
    client_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    # Extract updates (supports single TF or multi-timeframe batch)
    updates = payload.extract_timeframe_updates()
    received_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not updates:
        candle_time_str = "--"
        raw_ts = payload.timestamp or payload.time or (payload.__extra__.get("timestamp") if hasattr(payload, "__extra__") else None)
        if raw_ts:
            try:
                ts_f = float(raw_ts)
                if ts_f > 1e11:
                    ts_f /= 1000.0
                candle_time_str = datetime.fromtimestamp(int(round(ts_f))).strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                pass

        req_entry = {
            "id": str(uuid.uuid4())[:8],
            "received_at": received_now,
            "candle_time": candle_time_str,
            "time": received_now,
            "time_str": received_now,
            "client_ip": client_ip,
            "symbols": [],
            "timeframes": [],
            "metrics_count": 0,
            "alerts_count": 0,
            "duration_ms": round((time.time() - t0) * 1000, 2),
            "status": "IGNORED (No timeframe data)",
            "sample_price": None,
            "raw_preview": payload.dict(exclude_none=True)
        }
        recent_requests.appendleft(req_entry)
        request_stats["total_requests"] += 1
        request_stats["error_count"] += 1
        store.record_request(req_entry)
        return {"status": "ignored", "reason": "No valid timeframe data found"}

    processed_cells = []
    all_triggered_alerts = []

    for sym, tf, ts, metrics in updates:
        # Update state in storage
        prev_data = store.update_cell(sym, tf, ts, metrics)

        # Evaluate alerting rules with exact indicator timestamp
        triggered = alert_engine.evaluate(sym, tf, metrics, prev_data, timestamp=ts)
        if triggered:
            all_triggered_alerts.extend([a.dict() for a in triggered])

        bias = store._evaluate_cell_bias(metrics)
        cell_obj = store.matrix.get(sym, {}).get(tf, {})
        tp_eval = store._evaluate_trend_and_pressure(cell_obj)
        cell_info = {
            "symbol": sym,
            "tf": tf,
            "updated_at": ts,
            "data": metrics,
            "bias": bias,
            "trend": tp_eval["trend"],
            "pressure": tp_eval["pressure"],
            "recent_signals": tp_eval["recent_signals"],
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

    # 4. Record trace log
    dur_ms = round((time.time() - t0) * 1000, 2)
    sample_price = None
    for u in updates:
        if "price" in u[3]:
            sample_price = u[3]["price"]
            break

    candle_ts = None
    for u in updates:
        if u[2] and u[2] > 0:
            candle_ts = u[2]
            break
    if candle_ts:
        try:
            candle_time_str = datetime.fromtimestamp(int(round(float(candle_ts)))).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            candle_time_str = "--"
    else:
        candle_time_str = "--"

    req_entry = {
        "id": str(uuid.uuid4())[:8],
        "received_at": received_now,
        "candle_time": candle_time_str,
        "time": received_now,
        "time_str": received_now,
        "client_ip": client_ip,
        "symbols": list(set(u[0] for u in updates)),
        "timeframes": list(set(u[1] for u in updates)),
        "metrics_count": sum(len(u[3]) for u in updates),
        "alerts_count": len(all_triggered_alerts),
        "duration_ms": dur_ms,
        "status": "200 OK",
        "sample_price": sample_price,
        "raw_preview": payload.dict(exclude_none=True)
    }
    recent_requests.appendleft(req_entry)
    request_stats["total_requests"] += 1
    request_stats["success_count"] += 1
    request_stats["alerts_count"] += len(all_triggered_alerts)
    request_stats["last_request_time"] = req_entry["received_at"]
    store.record_request(req_entry)

    return {
        "status": "success",
        "processed_count": len(processed_cells),
        "alerts_triggered": len(all_triggered_alerts)
    }


@app.get("/api/v1/requests")
@app.get("/api/requests")
async def get_recent_requests(limit: int = 100):
    """Returns recent requests traces and statistics."""
    return {
        "stats": dict(request_stats),
        "requests": list(recent_requests)[:limit]
    }


@app.delete("/api/v1/requests")
@app.delete("/api/requests")
async def clear_recent_requests():
    """Clears recent requests traces from memory and database."""
    recent_requests.clear()
    store.clear_stored_requests()
    request_stats["total_requests"] = 0
    request_stats["success_count"] = 0
    request_stats["error_count"] = 0
    request_stats["alerts_count"] = 0
    request_stats["last_request_time"] = None
    return {"status": "cleared"}


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


# --------------------------------------------------------------------------
# HISTORICAL DATA & PERSISTENCE EXPLORER ENDPOINTS
# --------------------------------------------------------------------------
@app.get("/api/v1/data/stats")
async def get_data_stats():
    """Returns database size, retention configuration, and row counts for stored data."""
    try:
        db_size = os.path.getsize(store.db_path) if os.path.exists(store.db_path) else 0
        alerts_res = store.query_stored_alerts(limit=1)
        reqs_res = store.query_stored_requests(limit=1)
        cells = store.query_stored_cells()
        return {
            "status": "ok",
            "db_path": store.db_path,
            "db_size_bytes": db_size,
            "db_size_formatted": f"{db_size / 1024:.1f} KB",
            "retention_days": RETENTION_DAYS,
            "total_alerts": alerts_res.get("total", 0),
            "total_requests": reqs_res.get("total", 0),
            "total_cells": len(cells)
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@app.post("/api/v1/data/purge")
async def manual_data_purge(days: int = Query(RETENTION_DAYS, ge=1, le=365)):
    """Manually triggers rolling purge for data older than specified days."""
    res = store.purge_old_data(days=days)
    return res


@app.get("/api/v1/data/alerts")
async def get_stored_alerts(
    symbol: Optional[str] = None,
    tf: Optional[str] = None,
    rule_name: Optional[str] = None,
    search: Optional[str] = None,
    alert_id: Optional[str] = None,
    order_by: str = Query("timestamp"),
    order_dir: str = Query("desc"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Queries stored alerts from SQLite with pagination, sorting, and filters."""
    return store.query_stored_alerts(
        symbol=symbol,
        tf=tf,
        rule_name=rule_name,
        search=search,
        alert_id=alert_id,
        order_by=order_by,
        order_dir=order_dir,
        limit=limit,
        offset=offset
    )


@app.get("/api/v1/data/alerts/export.csv")
async def export_stored_alerts_csv(
    symbol: Optional[str] = None,
    tf: Optional[str] = None,
    rule_name: Optional[str] = None,
    search: Optional[str] = None,
    order_by: str = Query("timestamp"),
    order_dir: str = Query("desc")
):
    """Exports matching historical alerts to a downloadable CSV file with sorting."""
    res = store.query_stored_alerts(
        symbol=symbol,
        tf=tf,
        rule_name=rule_name,
        search=search,
        order_by=order_by,
        order_dir=order_dir,
        limit=5000,
        offset=0
    )
    alerts = res.get("alerts", [])
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow([
        "ID", "Date Heure", "Timestamp", "Symbole", "Timeframe",
        "Nom Alerte", "Champ", "Valeur", "Seuil", "Sévérité",
        "Message", "Open Bougie"
    ])
    for a in alerts:
        ts_val = a.get("timestamp")
        ts_clean = str(int(round(float(ts_val)))) if ts_val is not None and str(ts_val).strip() != "" else ""
        writer.writerow([
            a.get("id"),
            a.get("datetime_str") or a.get("time_str"),
            ts_clean,
            a.get("symbol"),
            a.get("tf"),
            a.get("rule_name"),
            a.get("field"),
            a.get("value"),
            a.get("threshold"),
            a.get("severity"),
            a.get("message"),
            a.get("candle_open")
        ])
    
    csv_bytes = output.getvalue().encode('utf-8-sig')  # UTF-8 BOM for Excel
    filename = f"tv_alerts_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/v1/data/alerts/{alert_id}")
async def get_stored_alert_detail(alert_id: str):
    """Queries full detail for a specific alert by id, including cell indicators if available."""
    alert = store.get_stored_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    sym = alert.get("symbol")
    tf = alert.get("tf")
    cell_data = None
    if sym and tf:
        cell_info = store.get_stored_cell_detail(sym, tf)
        if cell_info:
            cell_data = cell_info.get("data")
    
    return {
        "status": "ok",
        "alert": alert,
        "cell_indicators": cell_data
    }


@app.get("/api/v1/data/requests/export.csv")
async def export_stored_requests_csv(
    symbol: Optional[str] = None,
    tf: Optional[str] = None,
    alerts_only: bool = False,
    search: Optional[str] = None
):
    """Exports stored webhook requests to CSV format."""
    res = store.query_stored_requests(symbol=symbol, tf=tf, alerts_only=alerts_only, search=search, limit=5000)
    reqs = res.get("requests", [])

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(["ID", "Date Heure Reception", "Date Heure Bougie", "IP Source", "Symboles", "Timeframes", "Indicateurs", "Alertes", "Prix Detecte", "Latence (ms)", "Statut"])

    for r in reqs:
        sym_str = ",".join(r.get("symbols", [])) if isinstance(r.get("symbols"), list) else str(r.get("symbols", ""))
        tf_str = ",".join(r.get("timeframes", [])) if isinstance(r.get("timeframes"), list) else str(r.get("timeframes", ""))
        writer.writerow([
            r.get("id"),
            r.get("received_at") or r.get("time_str", "--"),
            r.get("candle_time", "--"),
            r.get("client_ip", "--"),
            sym_str,
            tf_str,
            r.get("metrics_count", 0),
            r.get("alerts_count", 0),
            r.get("sample_price", ""),
            r.get("duration_ms", 0),
            r.get("status", "200 OK")
        ])

    csv_bytes = output.getvalue().encode('utf-8-sig')
    filename = f"tv_requests_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/v1/data/requests")
async def get_stored_requests(
    symbol: Optional[str] = None,
    tf: Optional[str] = None,
    alerts_only: bool = False,
    search: Optional[str] = None,
    req_id: Optional[str] = None,
    order_by: str = Query("timestamp"),
    order_dir: str = Query("desc"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Queries stored webhook requests from SQLite with pagination, sorting, and filters."""
    return store.query_stored_requests(
        symbol=symbol,
        tf=tf,
        alerts_only=alerts_only,
        search=search,
        req_id=req_id,
        order_by=order_by,
        order_dir=order_dir,
        limit=limit,
        offset=offset
    )


@app.get("/api/v1/data/requests/{req_id}")
async def get_stored_request_detail(req_id: str):
    """Queries detail and raw payload of a specific stored webhook request."""
    req = store.get_stored_request(req_id)
    if not req:
        raise HTTPException(status_code=404, detail="Webhook request not found")
    return req


@app.get("/api/v1/data/cells")
async def get_stored_cells():
    """Queries list of stored matrix cells from SQLite."""
    cells = store.query_stored_cells()
    return {"cells": cells, "total": len(cells)}


@app.get("/api/v1/data/cells/{symbol}/{tf}")
async def get_stored_cell_detail(symbol: str, tf: str):
    """Queries full JSON indicator metrics of a stored cell."""
    detail = store.get_stored_cell_detail(symbol, tf)
    if not detail:
        raise HTTPException(status_code=404, detail="Cell not found")
    return detail


@app.get("/api/v1/data/db/download")
async def download_database():
    """Downloads the raw SQLite tv_data.db file."""
    if not os.path.exists(store.db_path):
        raise HTTPException(status_code=404, detail="Database file not found")
    return FileResponse(
        path=store.db_path,
        media_type="application/vnd.sqlite3",
        filename="tv_data.db"
    )


# --------------------------------------------------------------------------
# VISUAL WEB MONITOR DASHBOARD & DATA EXPLORER (GET / or GET /monitor)
# --------------------------------------------------------------------------
MONITOR_HTML_PATH = os.path.join(os.path.dirname(__file__), "monitor.html")


@app.get("/", response_class=HTMLResponse)
@app.get("/monitor", response_class=HTMLResponse)
async def monitor_dashboard():
    """Serves visual live monitor dashboard and SQLite data explorer."""
    if os.path.exists(MONITOR_HTML_PATH):
        with open(MONITOR_HTML_PATH, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Template monitor.html introuvable</h1>", status_code=500)


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
