import os
import sys
import json
import time
import asyncio
import subprocess
import httpx
from collections import deque
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional

from backend.config_manager import load_config, save_config

class Candle:
    def __init__(self, start_time, open_price):
        self.time = start_time
        self.open = open_price
        self.high = open_price
        self.low = open_price
        self.close = open_price
        self.volume = 1

    def update(self, price):
        self.high = max(self.high, price)
        self.low = min(self.low, price)
        self.close = price
        self.volume += 1

    def to_dict(self):
        return {
            "t": self.time,
            "o": self.open,
            "h": self.high,
            "l": self.low,
            "c": self.close,
            "v": self.volume
        }

class QuoteAggregator:
    def __init__(self):
        self.history = {
            15: deque(maxlen=2000),
            30: deque(maxlen=2000),
            45: deque(maxlen=2000),
            60: deque(maxlen=2000)
        }
        self.current_candle = {
            15: None,
            30: None,
            45: None,
            60: None
        }

    def add_tick(self, timestamp, price):
        for res, q in self.history.items():
            bar_time = (int(timestamp) // res) * res
            current = self.current_candle[res]
            
            if current is None:
                self.current_candle[res] = Candle(bar_time, price)
            elif current.time == bar_time:
                current.update(price)
            else:
                q.append(current.to_dict())
                self.current_candle[res] = Candle(bar_time, price)

    def get_history(self, resolution: str, from_time: int, to_time: int):
        res_seconds = 15
        res_str = resolution.upper()
        if "S" in res_str:
            try:
                res_seconds = int(res_str.replace("S", ""))
            except:
                res_seconds = 15
        else:
            try:
                res_seconds = int(resolution) * 60
            except:
                res_seconds = 60
                
        if res_seconds not in self.history:
            return {"s": "no_data"}
            
        candles = list(self.history[res_seconds])
        
        current = self.current_candle[res_seconds]
        if current and from_time <= current.time <= to_time:
            candles.append(current.to_dict())
            
        filtered = [c for c in candles if from_time <= c["t"] <= to_time]
        
        if not filtered:
            return {"s": "no_data"}
            
        return {
            "s": "ok",
            "t": [c["t"] for c in filtered],
            "o": [c["o"] for c in filtered],
            "h": [c["h"] for c in filtered],
            "l": [c["l"] for c in filtered],
            "c": [c["c"] for c in filtered],
            "v": [c["v"] for c in filtered]
        }

quote_aggregator = QuoteAggregator()
latest_quote = None

# Global dict to store references to subprocesses
workers = {
    "long": None,
    "short": None
}

# HTTP Client for proxying requests to workers
http_client: Optional[httpx.AsyncClient] = None

AUTOBE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "autobe_positions.json")

def load_autobe_overrides() -> dict:
    if not os.path.exists(AUTOBE_FILE):
        return {}
    try:
        with open(AUTOBE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading autobe overrides: {e}")
        return {}

def save_autobe_overrides(data: dict):
    try:
        with open(AUTOBE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving autobe overrides: {e}")
        return False

def start_worker_process(port: int, path: str, account_type: str):
    """Start a worker subprocess and redirect its logs to a file."""
    worker_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "worker.py")
    cmd = [
        sys.executable,
        worker_script,
        "--port", str(port),
        "--path", path,
        "--type", account_type
    ]
    print(f"Spawning worker: {' '.join(cmd)}")
    
    # Log files in the parent directory
    log_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    log_file_path = os.path.join(log_dir, f"worker_{account_type}.log")
    
    log_file = open(log_file_path, "a", encoding="utf-8")
    log_file.write(f"\n--- Worker {account_type} spawned ---\n")
    log_file.flush()
    
    # Hide window console on Windows if starting in background (optional, but keep it clean)
    creationflags = 0
    if sys.platform == "win32":
        # CREATE_NO_WINDOW = 0x08000000
        creationflags = 0x08000000
        
    process = subprocess.Popen(
        cmd,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=creationflags
    )
    return process

def terminate_worker(account_type: str):
    """Safely terminate a worker subprocess."""
    proc = workers.get(account_type)
    if proc:
        print(f"Terminating {account_type} worker (PID {proc.pid})...")
        proc.terminate()
        try:
            proc.wait(timeout=2)
            print(f"{account_type} worker terminated.")
        except subprocess.TimeoutExpired:
            print(f"Force-killing {account_type} worker...")
            proc.kill()
            proc.wait()
        workers[account_type] = None

def start_all_workers(config):
    """Start both Long and Short worker subprocesses."""
    # Ensure existing workers are stopped
    stop_all_workers()
    
    workers["long"] = start_worker_process(8011, config["terminal_path_long"], "long")
    workers["short"] = start_worker_process(8012, config["terminal_path_short"], "short")

def stop_all_workers():
    """Stop both workers."""
    terminate_worker("long")
    terminate_worker("short")

def get_pip_size(symbol: str) -> float:
    """Helper to determine pip size for calculations."""
    name = symbol.upper()
    if "JPY" in name:
        return 0.01
    if any(x in name for x in ["GER", "DE", "FRA", "CAC", "US", "NAS", "SP", "HK", "UK", "ESTX", "ESP"]):
        return 1.0
    if len(name) == 6 or "USD" in name or "EUR" in name or "GBP" in name:
        return 0.0001
    return 1.0

async def auto_be_loop():
    """Background task to monitor open positions and apply AutoBE protection."""
    print("AutoBE background monitor started.")
    await asyncio.sleep(3) # Wait for startup to complete and workers to connect
    while True:
        try:
            config = load_config()
            symbol = config["symbol"]
            positions = await get_positions()
            
            for pos in positions:
                if pos["symbol"] != symbol:
                    continue
                
                pos_auto_be = pos.get("auto_be_pips", 0)
                if pos_auto_be <= 0:
                    continue
                
                ticket = pos["ticket"]
                price_open = pos["price_open"]
                price_current = pos["price_current"]
                sl = pos["sl"]
                tp = pos["tp"]
                pos_type = pos["type"]
                account_type = pos["account_type"]
                
                pip_size = get_pip_size(symbol)
                
                # Calculate profit in pips
                pips_profit = 0.0
                if pos_type == "BUY":
                    pips_profit = (price_current - price_open) / pip_size
                elif pos_type == "SELL":
                    pips_profit = (price_open - price_current) / pip_size
                
                if pips_profit >= pos_auto_be:
                    needs_be = False
                    if pos_type == "BUY":
                        if sl == 0.0 or sl < (price_open - 0.01 * pip_size):
                            needs_be = True
                    elif pos_type == "SELL":
                        if sl == 0.0 or sl > (price_open + 0.01 * pip_size):
                            needs_be = True
                            
                    if needs_be:
                        print(f"[AutoBE] Triggered for ticket #{ticket} ({pos_type}). Profit: {pips_profit:.1f} pips >= {pos_auto_be}. Moving SL to entry {price_open}.")
                        target_port = 8011 if account_type.lower() == "long" else 8012
                        worker_url = f"http://127.0.0.1:{target_port}/position/modify"
                        payload = {
                            "ticket": ticket,
                            "symbol": symbol,
                            "sl": float(price_open),
                            "tp": float(tp)
                        }
                        try:
                            res = await http_client.post(worker_url, json=payload, timeout=2.0)
                            if res.status_code == 200:
                                print(f"[AutoBE] Successfully moved SL to BE for ticket #{ticket}.")
                            else:
                                print(f"[AutoBE] Failed to modify ticket #{ticket}: {res.text}")
                        except Exception as e:
                            print(f"[AutoBE] Error calling worker for ticket #{ticket}: {e}")
        except Exception as e:
            print(f"Error in AutoBE loop: {e}")
        await asyncio.sleep(1.0)
async def quote_polling_loop():
    """Background task to poll MT5 ticks and feed the aggregator."""
    global latest_quote
    print("Quote polling background task started.")
    await asyncio.sleep(3) # Wait for workers to launch
    while True:
        try:
            config = load_config()
            symbol = config["symbol"]
            
            quote = None
            for port in [8011, 8012]:
                try:
                    url = f"http://127.0.0.1:{port}/quote?symbol={symbol}"
                    res = await http_client.get(url, timeout=0.15)
                    if res.status_code == 200:
                        quote = res.json()
                        break
                except Exception:
                    pass
            
            if quote:
                latest_quote = quote
                # Feed tick to aggregator
                quote_aggregator.add_tick(quote["time"], quote["bid"])
            else:
                latest_quote = {'error': 'No MT5 connection', 'symbol': symbol}
        except Exception as e:
            print(f"Error in quote polling loop: {e}")
            
        await asyncio.sleep(0.25)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    # Initialize HTTP client
    http_client = httpx.AsyncClient()
    
    # Load configuration
    config = load_config()
    
    # Start workers
    start_all_workers(config)
    
    # Wait for workers to launch and initialize
    await asyncio.sleep(2)
    
    # Start background autoBE monitor
    auto_be_task = asyncio.create_task(auto_be_loop())
    # Start background quote polling
    quote_poll_task = asyncio.create_task(quote_polling_loop())
    
    yield
    
    # Cancel tasks
    auto_be_task.cancel()
    quote_poll_task.cancel()
    try:
        await asyncio.gather(auto_be_task, quote_poll_task, return_exceptions=True)
    except Exception:
        pass
        
    # Shutdown HTTP Client
    if http_client:
        await http_client.aclose()
        
    # Stop workers
    stop_all_workers()
app = FastAPI(title="Robby", lifespan=lifespan)

# Allow CORS for ease of access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serves static files from /static path, referencing frontend folder
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/")
async def get_index():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend index.html not found. Place it in frontend/index.html"}

# --- API ENDPOINTS ---

@app.get("/api/status")
async def get_status():
    """Aggregate status from both workers."""
    status_long = {"connected": False, "error": "Not queried"}
    status_short = {"connected": False, "error": "Not queried"}
    
    try:
        res = await http_client.get("http://127.0.0.1:8011/status", timeout=1.0)
        status_long = res.json()
    except Exception as e:
        status_long = {"connected": False, "error": str(e)}
        
    try:
        res = await http_client.get("http://127.0.0.1:8012/status", timeout=1.0)
        status_short = res.json()
    except Exception as e:
        status_short = {"connected": False, "error": str(e)}
        
    return {
        "long_terminal": status_long,
        "short_terminal": status_short
    }

@app.get("/api/positions")
async def get_positions():
    """Retrieve and merge open positions from both workers."""
    config = load_config()
    symbol = config["symbol"]
    positions = []
    
    # Fetch from Long worker
    try:
        res = await http_client.get(f"http://127.0.0.1:8011/positions?symbol={symbol}", timeout=1.0)
        if res.status_code == 200:
            positions.extend(res.json())
    except Exception as e:
        print(f"Error fetching positions from Long worker: {e}")
        
    # Fetch from Short worker
    try:
        res = await http_client.get(f"http://127.0.0.1:8012/positions?symbol={symbol}", timeout=1.0)
        if res.status_code == 200:
            positions.extend(res.json())
    except Exception as e:
        print(f"Error fetching positions from Short worker: {e}")
        
    # Enrich positions with custom AutoBE thresholds and perform automatic pruning
    overrides = load_autobe_overrides()
    global_auto_be = config.get("auto_be_pips", 0)
    
    active_tickets = set()
    for pos in positions:
        ticket_str = str(pos["ticket"])
        active_tickets.add(ticket_str)
        if ticket_str in overrides:
            pos["auto_be_pips"] = overrides[ticket_str]
        else:
            pos["auto_be_pips"] = global_auto_be
            
    # Clean up stale overrides
    stale_keys = [t for t in overrides if t not in active_tickets]
    if stale_keys:
        for t in stale_keys:
            del overrides[t]
        save_autobe_overrides(overrides)
        
    return positions

@app.get("/api/orders")
async def get_api_orders():
    """Retrieve and merge pending orders from both workers."""
    config = load_config()
    symbol = config["symbol"]
    orders = []
    
    # Fetch from Long worker
    try:
        res = await http_client.get(f"http://127.0.0.1:8011/orders?symbol={symbol}", timeout=1.0)
        if res.status_code == 200:
            orders.extend(res.json())
    except Exception as e:
        print(f"Error fetching orders from Long worker: {e}")
        
    # Fetch from Short worker
    try:
        res = await http_client.get(f"http://127.0.0.1:8012/orders?symbol={symbol}", timeout=1.0)
        if res.status_code == 200:
            orders.extend(res.json())
    except Exception as e:
        print(f"Error fetching orders from Short worker: {e}")
        
    return orders

class OrderRequest(BaseModel):
    action: str  # "BUY" or "SELL"
    volume: float
    sl_points: float = 0.0
    tp_points: float = 0.0
    split: Optional[bool] = False
    scenario: Optional[int] = 0

@app.post("/api/order")
async def place_order(req: OrderRequest):
    """Route order: BUY -> Long worker (8011), SELL -> Short worker (8012). Support split order execution."""
    config = load_config()
    symbol = config["symbol"]
    
    # Check max spread limit
    max_spread = config.get("max_spread_pips", 8.0)
    if max_spread > 0:
        quote = None
        if latest_quote and "bid" in latest_quote and "ask" in latest_quote:
            quote = latest_quote
        else:
            # Fallback: query a worker for the latest quote
            for port in [8011, 8012]:
                try:
                    url = f"http://127.0.0.1:{port}/quote?symbol={symbol}"
                    res = await http_client.get(url, timeout=0.5)
                    if res.status_code == 200:
                        quote = res.json()
                        break
                except Exception:
                    pass
        
        if quote and "bid" in quote and "ask" in quote:
            bid = quote["bid"]
            ask = quote["ask"]
            pip_size = get_pip_size(symbol)
            current_spread = (ask - bid) / pip_size if pip_size > 0 else (ask - bid)
            
            if current_spread > max_spread:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Ordre refusé : Le spread actuel ({current_spread:.1f} pips) dépasse le spread max autorisé ({max_spread} pips)"
                )
    
    action = req.action.upper()
    target_port = 8011 if action == "BUY" else 8012
    worker_url = f"http://127.0.0.1:{target_port}/order"
    
    # Check if this is a split order request for 0.75 lot
    if req.split and req.volume == 0.75:
        # Determine TP for each order in the split
        if req.scenario == 1:
            tp_list = [10.0, 20.0, req.tp_points]
        else:
            tp_list = [req.tp_points, req.tp_points, req.tp_points]
            
        tasks = []
        for i in range(3):
            payload = {
                "symbol": symbol,
                "action": action,
                "volume": 0.25,
                "sl_points": req.sl_points,
                "tp_points": tp_list[i]
            }
            tasks.append(http_client.post(worker_url, json=payload, timeout=5.0))
            
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = 0
        tickets = []
        prices = []
        errors = []
        
        for res in responses:
            if isinstance(res, Exception):
                errors.append(str(res))
            elif res.status_code != 200:
                try:
                    errors.append(res.json().get("detail", "Worker error"))
                except:
                    errors.append(f"HTTP {res.status_code}")
            else:
                data = res.json()
                if data.get("success"):
                    success_count += 1
                    tickets.append(data.get("ticket"))
                    prices.append(data.get("price"))
                    
        if success_count > 0:
            return {
                "success": True,
                "split": True,
                "ticket": tickets[0] if tickets else None,  # For backward-compatibility with UI notifications
                "tickets": tickets,
                "prices": prices,
                "volume": success_count * 0.25,
                "success_count": success_count,
                "errors": errors
            }
            
        raise HTTPException(
            status_code=400,
            detail=f"All split orders failed: {', '.join(set(errors))}"
        )
        
    payload = {
        "symbol": symbol,
        "action": action,
        "volume": req.volume,
        "sl_points": req.sl_points,
        "tp_points": req.tp_points
    }
    
    try:
        res = await http_client.post(worker_url, json=payload, timeout=5.0)
        if res.status_code != 200:
            error_detail = "Unknown worker error"
            try:
                error_detail = res.json().get("detail", error_detail)
            except:
                pass
            raise HTTPException(status_code=res.status_code, detail=error_detail)
        return res.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to communicate with MT5 worker: {e}")

class CloseRequest(BaseModel):
    ticket: int
    volume: float
    account_type: str  # "long" or "short"

@app.post("/api/position/close")
async def close_position(req: CloseRequest):
    """Route position close to correct worker."""
    config = load_config()
    symbol = config["symbol"]
    
    target_port = 8011 if req.account_type.lower() == "long" else 8012
    worker_url = f"http://127.0.0.1:{target_port}/position/close"
    
    payload = {
        "ticket": req.ticket,
        "symbol": symbol,
        "volume": req.volume
    }
    
    try:
        res = await http_client.post(worker_url, json=payload, timeout=5.0)
        if res.status_code != 200:
            error_detail = "Unknown worker error"
            try:
                error_detail = res.json().get("detail", error_detail)
            except:
                pass
            raise HTTPException(status_code=res.status_code, detail=error_detail)
        return res.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to communicate with MT5 worker: {e}")

class CancelOrderRequest(BaseModel):
    ticket: int
    account_type: str

@app.post("/api/order/cancel")
async def cancel_order(req: CancelOrderRequest):
    """Route order cancel to correct worker."""
    target_port = 8011 if req.account_type.lower() == "long" else 8012
    worker_url = f"http://127.0.0.1:{target_port}/order/cancel"
    
    payload = {
        "ticket": req.ticket
    }
    
    try:
        res = await http_client.post(worker_url, json=payload, timeout=5.0)
        if res.status_code != 200:
            error_detail = "Unknown worker error"
            try:
                error_detail = res.json().get("detail", error_detail)
            except:
                pass
            raise HTTPException(status_code=res.status_code, detail=error_detail)
        return res.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to communicate with MT5 worker: {e}")

class AutoBERequest(BaseModel):
    ticket: int
    auto_be_pips: Optional[int] = None

@app.post("/api/position/autobe")
async def update_position_autobe(req: AutoBERequest):
    overrides = load_autobe_overrides()
    ticket_str = str(req.ticket)
    if req.auto_be_pips is None:
        if ticket_str in overrides:
            del overrides[ticket_str]
    else:
        overrides[ticket_str] = req.auto_be_pips
    
    if save_autobe_overrides(overrides):
        return {"success": True, "message": "Position AutoBE updated"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save position AutoBE config")

class ModifyRequest(BaseModel):
    ticket: int
    sl: float
    tp: float
    account_type: str  # "long" or "short"

@app.post("/api/position/modify")
async def modify_position(req: ModifyRequest):
    """Route position modify to correct worker."""
    config = load_config()
    symbol = config["symbol"]
    
    target_port = 8011 if req.account_type.lower() == "long" else 8012
    worker_url = f"http://127.0.0.1:{target_port}/position/modify"
    
    payload = {
        "ticket": req.ticket,
        "symbol": symbol,
        "sl": req.sl,
        "tp": req.tp
    }
    
    try:
        res = await http_client.post(worker_url, json=payload, timeout=5.0)
        if res.status_code != 200:
            error_detail = "Unknown worker error"
            try:
                error_detail = res.json().get("detail", error_detail)
            except:
                pass
            raise HTTPException(status_code=res.status_code, detail=error_detail)
        return res.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to communicate with MT5 worker: {e}")

@app.get("/api/config")
async def get_config():
    """Retrieve config file values."""
    return load_config()

class ConfigUpdateRequest(BaseModel):
    symbol: str
    terminal_path_long: str
    terminal_path_short: str
    default_lot: float
    default_sl_points: float
    default_tp_points: float
    auto_be_pips: int
    max_spread_pips: float

@app.post("/api/config")
async def update_config(req: ConfigUpdateRequest):
    """Save config and trigger restart of workers only if critical paths or symbol changed."""
    old_config = load_config()
    
    config = {
        "symbol": req.symbol,
        "terminal_path_long": req.terminal_path_long,
        "terminal_path_short": req.terminal_path_short,
        "default_lot": req.default_lot,
        "default_sl_points": req.default_sl_points,
        "default_tp_points": req.default_tp_points,
        "auto_be_pips": req.auto_be_pips,
        "max_spread_pips": req.max_spread_pips
    }
    
    # Save the config file
    if save_config(config):
        # Restart workers only if paths or symbol changed
        paths_changed = (
            old_config.get("terminal_path_long") != req.terminal_path_long or
            old_config.get("terminal_path_short") != req.terminal_path_short or
            old_config.get("symbol") != req.symbol
        )
        if paths_changed:
            print("Symbol or terminal paths changed. Restarting worker processes...")
            start_all_workers(config)
            return {"success": True, "message": "Config saved and workers restarted"}
        else:
            print("Non-critical config updated. Workers remain connected.")
            return {"success": True, "message": "Config saved"}
    else:
        raise HTTPException(status_code=500, detail="Failed to write configuration file")
@app.get("/api/stream-quotes")
async def stream_quotes(request: Request):
    """SSE endpoint to stream price ticks to the frontend."""
    async def quote_generator():
        while True:
            if await request.is_disconnected():
                break
                
            if latest_quote:
                yield f"data: {json.dumps(latest_quote)}\n\n"
            else:
                symbol = load_config()["symbol"]
                yield f"data: {json.dumps({'error': 'No MT5 connection', 'symbol': symbol})}\n\n"
                
            await asyncio.sleep(0.25)
            
    return StreamingResponse(quote_generator(), media_type="text/event-stream")

async def fetch_from_worker(endpoint: str, params: dict):
    # Try long worker first, then short worker
    for port in [8011, 8012]:
        try:
            url = f"http://127.0.0.1:{port}{endpoint}"
            res = await http_client.get(url, params=params, timeout=5.0)
            if res.status_code == 200:
                return res.json()
        except Exception as e:
            print(f"Error fetching {endpoint} from worker on port {port}: {e}")
    return None

@app.get("/api/udf/config")
async def get_udf_config():
    return {
        "supports_search": False,
        "supports_group_request": False,
        "supports_marks": False,
        "supports_timescale_marks": False,
        "supports_time": True,
        "supported_resolutions": ["15S", "30S", "45S", "1", "2", "3", "5", "15", "30", "60", "D"]
    }

@app.get("/api/udf/time")
async def get_udf_time():
    return int(time.time())

@app.get("/api/udf/symbols")
async def get_udf_symbols(symbol: str):
    config = load_config()
    if symbol.upper() != config["symbol"].upper():
        raise HTTPException(status_code=404, detail="Symbol not found")
        
    return {
        "name": symbol,
        "ticker": symbol,
        "description": f"{symbol} Index",
        "type": "stock",
        "session": "24x7",
        "timezone": "Europe/Paris",
        "exchange": "MT5",
        "minmov": 1,
        "pricescale": 10,
        "has_intraday": True,
        "has_seconds": True,
        "seconds_multipliers": ["15", "30", "45"],
        "supported_resolutions": ["15S", "30S", "45S", "1", "2", "3", "5", "15", "30", "60", "D"]
    }

@app.get("/api/udf/history")
async def get_udf_history(symbol: str, resolution: str, from_time: int = Query(..., alias="from"), to_time: int = Query(..., alias="to")):
    config = load_config()
    if symbol.upper() != config["symbol"].upper():
        return {"s": "no_data"}
        
    res_str = resolution.upper()
    
    # 1. Handle standard resolutions (1, 5, 15, 30, 60, D)
    if "S" not in res_str:
        rates = await fetch_from_worker("/rates", {
            "symbol": config["symbol"],
            "resolution": resolution,
            "date_from": from_time,
            "date_to": to_time
        })
        if not rates:
            return {"s": "no_data"}
            
        return {
            "s": "ok",
            "t": [c["t"] for c in rates],
            "o": [c["o"] for c in rates],
            "h": [c["h"] for c in rates],
            "l": [c["l"] for c in rates],
            "c": [c["c"] for c in rates],
            "v": [c["v"] for c in rates]
        }
        
    # 2. Handle sub-minute resolutions (15S, 30S, 45S)
    try:
        res_seconds = int(res_str.replace("S", ""))
    except:
        res_seconds = 15
        
    if res_seconds not in [15, 30, 45]:
        return {"s": "no_data"}
        
    now = int(time.time())
    limit_seconds = 8 * 3600
    
    effective_from = max(from_time, now - limit_seconds)
    effective_to = min(to_time, now)
    
    if effective_from >= effective_to:
        current = quote_aggregator.current_candle.get(res_seconds)
        if current and from_time <= current.time <= to_time:
            c = current.to_dict()
            return {
                "s": "ok",
                "t": [c["t"]],
                "o": [c["o"]],
                "h": [c["h"]],
                "l": [c["l"]],
                "c": [c["c"]],
                "v": [c["v"]]
            }
        return {"s": "no_data"}
        
    ticks_data = await fetch_from_worker("/ticks", {
        "symbol": config["symbol"],
        "date_from": effective_from,
        "date_to": effective_to
    })
    
    fetched_candles = []
    if ticks_data:
        candles_dict = {}
        for tick in ticks_data:
            tick_time = tick["t"]
            price = tick["b"]
            volume = tick["v"]
            
            bar_time = (tick_time // res_seconds) * res_seconds
            if bar_time not in candles_dict:
                candles_dict[bar_time] = {
                    "t": bar_time,
                    "o": price,
                    "h": price,
                    "l": price,
                    "c": price,
                    "v": volume if volume > 0 else 1.0
                }
            else:
                c = candles_dict[bar_time]
                c["h"] = max(c["h"], price)
                c["l"] = min(c["l"], price)
                c["c"] = price
                c["v"] += volume if volume > 0 else 1.0
        fetched_candles = [candles_dict[t] for t in sorted(candles_dict.keys())]
        
    deque_candles = list(quote_aggregator.history.get(res_seconds, []))
    current_candle = quote_aggregator.current_candle.get(res_seconds)
    
    all_candles = {c["t"]: c for c in fetched_candles}
    for c in deque_candles:
        all_candles[c["t"]] = c
        
    if current_candle:
        all_candles[current_candle.time] = current_candle.to_dict()
        
    filtered_candles = [
        all_candles[t] for t in sorted(all_candles.keys())
        if from_time <= t <= to_time
    ]
    
    if not filtered_candles:
        return {"s": "no_data"}
        
    return {
        "s": "ok",
        "t": [c["t"] for c in filtered_candles],
        "o": [c["o"] for c in filtered_candles],
        "h": [c["h"] for c in filtered_candles],
        "l": [c["l"] for c in filtered_candles],
        "c": [c["c"] for c in filtered_candles],
        "v": [c["v"] for c in filtered_candles]
    }

@app.get("/api/history")
async def get_history():
    """Retrieve combined trade history and calculate daily statistics from both workers."""
    config = load_config()
    symbol = config["symbol"]
    
    # Fetch past 30 days of history
    now = int(time.time())
    days_ago = now - (30 * 24 * 3600)
    
    params = {
        "date_from": days_ago,
        "date_to": now,
        "symbol": symbol
    }
    
    deals = []
    
    # Query both Long (8011) and Short (8012) workers
    for port in [8011, 8012]:
        try:
            url = f"http://127.0.0.1:{port}/history"
            res = await http_client.get(url, params=params, timeout=5.0)
            if res.status_code == 200:
                acc_deals = res.json()
                for d in acc_deals:
                    d["account_type"] = "long" if port == 8011 else "short"
                deals.extend(acc_deals)
        except Exception as e:
            print(f"Error querying history from worker on port {port}: {e}")
            
    if not deals:
        return {"trades": [], "stats": []}
        
    # Group deals by position_id to reconstruct completed trades
    positions_deals = {}
    for d in deals:
        if d["type"] not in [0, 1]:
            continue
        pos_id = d["position_id"]
        if pos_id not in positions_deals:
            positions_deals[pos_id] = []
        positions_deals[pos_id].append(d)
        
    completed_trades = []
    for pos_id, p_deals in positions_deals.items():
        p_deals.sort(key=lambda x: x["time_msc"])
        
        open_deal = None
        close_deals = []
        
        for d in p_deals:
            if d["entry"] == 0:  # DEAL_ENTRY_IN (open)
                open_deal = d
            elif d["entry"] == 1:  # DEAL_ENTRY_OUT (close)
                close_deals.append(d)
                
        if close_deals:
            open_time = open_deal["time"] if open_deal else close_deals[0]["time"]
            open_price = open_deal["price"] if open_deal else close_deals[0]["price"]
            trade_volume = open_deal["volume"] if open_deal else sum(c["volume"] for c in close_deals)
            
            if open_deal:
                trade_direction = "BUY" if open_deal["type"] == 0 else "SELL"
            else:
                trade_direction = "BUY" if close_deals[0]["type"] == 1 else "SELL"
                
            total_profit = sum(c["profit"] for c in close_deals)
            total_commission = (open_deal["commission"] if open_deal else 0) + sum(c["commission"] for c in close_deals)
            total_swap = (open_deal["swap"] if open_deal else 0) + sum(c["swap"] for c in close_deals)
            net_profit = total_profit + total_commission + total_swap
            
            close_time = close_deals[-1]["time"]
            close_price = close_deals[-1]["price"]
            duration = max(0, close_time - open_time)
            
            pip_size = get_pip_size(symbol)
            pips = (close_price - open_price) / pip_size if trade_direction == "BUY" else (open_price - close_price) / pip_size if pip_size > 0 else 0.0
            pips_abs = abs(pips)
            if pips_abs < 1.0:
                category = "BE"
            elif net_profit > 0:
                category = "WIN"
            else:
                category = "LOSS"

            completed_trades.append({
                "position_id": pos_id,
                "symbol": symbol,
                "type": trade_direction,
                "volume": trade_volume,
                "open_time": open_time,
                "close_time": close_time,
                "open_price": open_price,
                "close_price": close_price,
                "duration": duration,
                "profit": total_profit,
                "commission": total_commission,
                "swap": total_swap,
                "net": net_profit,
                "category": category,
                "pips": round(pips, 2),
                "pips_diff": round(pips_abs, 2),
                "account_type": close_deals[0]["account_type"]
            })
            
    completed_trades.sort(key=lambda x: x["close_time"], reverse=True)
    
    from datetime import datetime, timezone
    daily_groups = {}
    for t in completed_trades:
        date_str = datetime.fromtimestamp(t["close_time"], timezone.utc).strftime("%Y-%m-%d")
        if date_str not in daily_groups:
            daily_groups[date_str] = []
        daily_groups[date_str].append(t)
        
    daily_stats = []
    for date_str, t_list in daily_groups.items():
        total_trades = len(t_list)
        winning_trades = sum(1 for t in t_list if t["category"] == "WIN")
        be_trades = sum(1 for t in t_list if t["category"] == "BE")
        losing_trades = sum(1 for t in t_list if t["category"] == "LOSS")
        
        # Win rate can be calculated as WIN trades over total
        win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0.0
        day_net = sum(t["net"] for t in t_list)
        day_pips = sum(t["pips"] for t in t_list)
        day_profit = sum(t["profit"] for t in t_list)
        day_commission = sum(t["commission"] for t in t_list)
        day_swap = sum(t["swap"] for t in t_list)
        
        daily_stats.append({
            "date": date_str,
            "trades_count": total_trades,
            "winning_count": winning_trades,
            "be_count": be_trades,
            "losing_count": losing_trades,
            "win_rate": round(win_rate, 1),
            "net": round(day_net, 2),
            "pips": round(day_pips, 1),
            "profit": round(day_profit, 2),
            "commission": round(day_commission, 2),
            "swap": round(day_swap, 2)
        })
        
    daily_stats.sort(key=lambda x: x["date"], reverse=True)
    
    return {
        "trades": completed_trades,
        "stats": daily_stats
    }

if __name__ == "__main__":
    import uvicorn
    # Main gateway runs on port 8010, binding to 0.0.0.0 to allow LAN access
    uvicorn.run(app, host="0.0.0.0", port=8010)
