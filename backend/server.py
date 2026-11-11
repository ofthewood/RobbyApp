import os
import sys
import json
import time
import asyncio
import subprocess
import httpx
from collections import deque
from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional

from backend.config_manager import load_config, save_config

# Patch Windows asyncio ProactorEventLoop to ignore transient connection drops (WinError 64, 10054, 121, etc.) on accept.
# Without this, when a browser client disconnects during accept (e.g. page refresh, network fluctuation),
# Windows IOCP raises OSError(WinError 64) which causes asyncio to close the listening socket and permanently kill the server.
if sys.platform == "win32":
    from asyncio import proactor_events, exceptions, trsock
    _orig_start_serving = proactor_events.BaseProactorEventLoop._start_serving

    def _patched_start_serving(self, protocol_factory, sock,
                               sslcontext=None, server=None, backlog=100,
                               ssl_handshake_timeout=None,
                               ssl_shutdown_timeout=None):
        def loop(f=None):
            try:
                if f is not None:
                    try:
                        conn, addr = f.result()
                    except OSError as exc:
                        if getattr(exc, 'winerror', None) in (64, 121, 10054, 1236):
                            conn = None
                        else:
                            raise
                    else:
                        if self._debug:
                            proactor_events.logger.debug("%r got a new connection from %r: %r",
                                                         server, addr, conn)
                        protocol = protocol_factory()
                        if sslcontext is not None:
                            self._make_ssl_transport(
                                conn, protocol, sslcontext, server_side=True,
                                extra={'peername': addr}, server=server,
                                ssl_handshake_timeout=ssl_handshake_timeout,
                                ssl_shutdown_timeout=ssl_shutdown_timeout)
                        else:
                            self._make_socket_transport(
                                conn, protocol,
                                extra={'peername': addr}, server=server)

                if self.is_closed():
                    return
                f = self._proactor.accept(sock)
            except OSError as exc:
                if sock.fileno() != -1:
                    self.call_exception_handler({
                        'message': 'Accept failed on a socket',
                        'exception': exc,
                        'socket': trsock.TransportSocket(sock),
                    })
                    sock.close()
                elif self._debug:
                    proactor_events.logger.debug("Accept failed on socket %r",
                                                 sock, exc_info=True)
            except exceptions.CancelledError:
                sock.close()
            else:
                self._accept_futures[sock.fileno()] = f
                f.add_done_callback(loop)

        self.call_soon(loop)

    proactor_events.BaseProactorEventLoop._start_serving = _patched_start_serving

class Candle:
    def __init__(self, start_time, open_price):
        self.time = int(start_time)
        self.start_time = int(start_time)
        self.end_time = int(start_time)
        self.open = open_price
        self.high = open_price
        self.low = open_price
        self.close = open_price
        self.volume = 1
        self.tick_count = 1
        self.active_duration = 1

    def update(self, price, timestamp=None):
        self.high = max(self.high, price)
        self.low = min(self.low, price)
        self.close = price
        self.volume += 1
        self.tick_count += 1
        if timestamp:
            ts = int(timestamp)
            delta = ts - self.end_time
            if 0 <= delta <= 120:
                self.active_duration += delta
            else:
                self.active_duration += 1
            self.end_time = ts

    def to_dict(self):
        return {
            "t": self.time,
            "o": self.open,
            "h": self.high,
            "l": self.low,
            "c": self.close,
            "v": self.volume,
            "t_start": self.start_time,
            "t_end": self.end_time,
            "duration": max(1, self.active_duration),
            "ticks": self.tick_count
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
        # Tick-based resolutions
        self.tick_resolutions = [100, 200, 400, 1000]
        self.tick_history = {
            100: deque(maxlen=2000),
            200: deque(maxlen=2000),
            400: deque(maxlen=2000),
            1000: deque(maxlen=2000)
        }
        self.current_tick_candle = {
            100: None,
            200: None,
            400: None,
            1000: None
        }
        self.last_completed_tick_candle = {
            100: None,
            200: None,
            400: None,
            1000: None
        }

    def add_tick(self, timestamp, price):
        ts = int(timestamp)
        # Time-based resolutions
        for res, q in self.history.items():
            bar_time = (ts // res) * res
            current = self.current_candle[res]
            
            if current is None:
                candle = Candle(bar_time, price)
                candle.end_time = ts
                self.current_candle[res] = candle
            elif current.time == bar_time:
                current.update(price, ts)
            else:
                q.append(current.to_dict())
                candle = Candle(bar_time, price)
                candle.end_time = ts
                self.current_candle[res] = candle

        # Tick-based resolutions
        for n_ticks in self.tick_resolutions:
            cur = self.current_tick_candle[n_ticks]
            if cur is None:
                candle = Candle(ts, price)
                candle.end_time = ts
                self.current_tick_candle[n_ticks] = candle
            else:
                # If there was a market pause or session gap (> 120s), finalize previous session candle
                if ts - cur.end_time > 120:
                    candle_dict = cur.to_dict()
                    self.tick_history[n_ticks].append(candle_dict)
                    self.last_completed_tick_candle[n_ticks] = candle_dict
                    new_candle = Candle(ts, price)
                    new_candle.end_time = ts
                    self.current_tick_candle[n_ticks] = new_candle
                else:
                    cur.update(price, ts)
                    if cur.tick_count >= n_ticks:
                        candle_dict = cur.to_dict()
                        self.tick_history[n_ticks].append(candle_dict)
                        self.last_completed_tick_candle[n_ticks] = candle_dict
                        self.current_tick_candle[n_ticks] = None

    def get_current_tick_status(self):
        status = {}
        for n_ticks in self.tick_resolutions:
            cur = self.current_tick_candle[n_ticks]
            last_done = self.last_completed_tick_candle.get(n_ticks)
            prev_dur = last_done.get("duration", 0) if last_done else 0
            if cur:
                dur = max(1, cur.active_duration)
                status[n_ticks] = {
                    "count": cur.tick_count,
                    "target": n_ticks,
                    "duration": dur,
                    "t_start": cur.start_time,
                    "prev_duration": prev_dur
                }
            else:
                status[n_ticks] = {
                    "count": n_ticks,
                    "target": n_ticks,
                    "duration": prev_dur if prev_dur > 0 else 1,
                    "t_start": last_done.get("t_start", 0) if last_done else 0,
                    "prev_duration": prev_dur
                }
        return status

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
tick_bars_cache = {}

def get_current_broker_time() -> int:
    """Return the current MT5 broker time from the live quote, or fallback to system time."""
    if latest_quote and isinstance(latest_quote, dict) and "time" in latest_quote and latest_quote["time"]:
        return int(latest_quote["time"])
    return int(time.time())

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

def is_single_mode(config: dict) -> bool:
    path_long = config.get("terminal_path_long", "").strip().lower().replace("\\", "/")
    path_short = config.get("terminal_path_short", "").strip().lower().replace("\\", "/")
    return path_long == path_short and path_long != ""

def start_worker_process(port: int, path: str, account_type: str):
    """Start a worker subprocess and redirect its logs to a file."""
    worker_script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "worker.py")
    cmd = [
        sys.executable,
        "-u",
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
    """Start worker subprocesses based on mode (Single or Double account)."""
    # Ensure existing workers are stopped
    stop_all_workers()
    
    if is_single_mode(config):
        print("[Server] Single Account Mode detected. Spawning only the Long worker on port 8011.")
        workers["long"] = start_worker_process(8011, config["terminal_path_long"], "long")
        workers["short"] = None
    else:
        print("[Server] Double Account Mode detected. Spawning both workers on ports 8011 and 8012.")
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
                        target_port = 8011 if (is_single_mode(config) or account_type.lower() == "long") else 8012
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
    last_tick_msc = 0
    last_tick_bid = 0.0
    while True:
        try:
            config = load_config()
            symbol = config["symbol"]
            
            quote = None
            ports = [8011] if is_single_mode(config) else [8011, 8012]
            for port in ports:
                try:
                    url = f"http://127.0.0.1:{port}/quote?symbol={symbol}"
                    res = await http_client.get(url, timeout=0.15)
                    if res.status_code == 200:
                        quote = res.json()
                        break
                except Exception:
                    pass
            
            if quote:
                # Only feed aggregator when a REAL new market tick arrived from MT5
                tick_msc = quote.get("time_msc", 0)
                tick_bid = quote.get("bid", 0.0)
                is_new_market_tick = (tick_msc != last_tick_msc) or (tick_bid != last_tick_bid)
                if is_new_market_tick:
                    quote_aggregator.add_tick(quote["time"], quote["bid"])
                    last_tick_msc = tick_msc
                    last_tick_bid = tick_bid

                quote["tick_status"] = quote_aggregator.get_current_tick_status()
                latest_quote = quote
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

# Disable caching for static files to prevent browser caching issues
@app.middleware("http")
async def disable_static_cache(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Serves static files from /static path, referencing frontend folder
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/")
async def get_index():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        response = FileResponse(index_path)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    return {"message": "Frontend index.html not found. Place it in frontend/index.html"}

# --- API ENDPOINTS ---

@app.get("/api/status")
async def get_status():
    """Aggregate status from both workers."""
    config = load_config()
    status_long = {"connected": False, "error": "Not queried"}
    status_short = {"connected": False, "error": "Not queried"}
    
    try:
        res = await http_client.get("http://127.0.0.1:8011/status", timeout=1.0)
        status_long = res.json()
    except Exception as e:
        status_long = {"connected": False, "error": str(e)}
        
    if is_single_mode(config):
        status_short = status_long.copy()
    else:
        try:
            res = await http_client.get("http://127.0.0.1:8012/status", timeout=1.0)
            status_short = res.json()
        except Exception as e:
            status_short = {"connected": False, "error": str(e)}
        
    return {
        "long_terminal": status_long,
        "short_terminal": status_short,
        "single_mode": is_single_mode(config)
    }

@app.get("/api/positions")
async def get_positions():
    """Retrieve and merge open positions from both workers."""
    config = load_config()
    symbol = config["symbol"]
    positions = []
    
    long_pos_ok = False
    short_pos_ok = False
    long_ord_ok = False
    short_ord_ok = False
    
    # Fetch from Long worker
    try:
        res = await http_client.get(f"http://127.0.0.1:8011/positions?symbol={symbol}", timeout=1.0)
        if res.status_code == 200:
            positions.extend(res.json())
            long_pos_ok = True
    except Exception as e:
        print(f"Error fetching positions from Long worker: {e}")
        
    if not is_single_mode(config):
        # Fetch from Short worker
        try:
            res = await http_client.get(f"http://127.0.0.1:8012/positions?symbol={symbol}", timeout=1.0)
            if res.status_code == 200:
                positions.extend(res.json())
                short_pos_ok = True
        except Exception as e:
            print(f"Error fetching positions from Short worker: {e}")
    else:
        short_pos_ok = True
        
    # Fetch orders to avoid pruning pending order overrides
    orders = []
    try:
        res = await http_client.get(f"http://127.0.0.1:8011/orders?symbol={symbol}", timeout=1.0)
        if res.status_code == 200:
            orders.extend(res.json())
            long_ord_ok = True
    except Exception as e:
        print(f"Error fetching orders from Long worker for AutoBE check: {e}")
        
    if not is_single_mode(config):
        try:
            res = await http_client.get(f"http://127.0.0.1:8012/orders?symbol={symbol}", timeout=1.0)
            if res.status_code == 200:
                orders.extend(res.json())
                short_ord_ok = True
        except Exception as e:
            print(f"Error fetching orders from Short worker for AutoBE check: {e}")
    else:
        short_ord_ok = True

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
            
    active_order_tickets = set(str(ord["ticket"]) for ord in orders)
    
    # Clean up stale overrides ONLY if we successfully fetched active state from all relevant workers
    if long_pos_ok and short_pos_ok and long_ord_ok and short_ord_ok:
        stale_keys = [t for t in overrides if t not in active_tickets and t not in active_order_tickets]
        if stale_keys:
            for t in stale_keys:
                del overrides[t]
            save_autobe_overrides(overrides)
    else:
        print(f"[AutoBE] Skipping overrides pruning due to incomplete worker responses: long_pos_ok={long_pos_ok}, short_pos_ok={short_pos_ok}, long_ord_ok={long_ord_ok}, short_ord_ok={short_ord_ok}")
        
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
        
    if not is_single_mode(config):
        # Fetch from Short worker
        try:
            res = await http_client.get(f"http://127.0.0.1:8012/orders?symbol={symbol}", timeout=1.0)
            if res.status_code == 200:
                orders.extend(res.json())
        except Exception as e:
            print(f"Error fetching orders from Short worker: {e}")
            
    # Enrich orders with custom AutoBE thresholds
    overrides = load_autobe_overrides()
    global_auto_be = config.get("auto_be_pips", 0)
    for ord in orders:
        ticket_str = str(ord["ticket"])
        if ticket_str in overrides:
            ord["auto_be_pips"] = overrides[ticket_str]
        else:
            ord["auto_be_pips"] = global_auto_be
        
    return orders

class OrderRequest(BaseModel):
    action: str  # "BUY" or "SELL"
    volume: float
    sl_points: float = 0.0
    tp_points: float = 0.0
    split: Optional[bool] = False
    scenario: Optional[int] = 0
    price: Optional[float] = None
    price_mode: Optional[str] = None

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
    target_port = 8011 if (is_single_mode(config) or action == "BUY") else 8012
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
            if req.price is not None:
                payload["price"] = req.price
            if req.price_mode is not None:
                payload["price_mode"] = req.price_mode
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
    if req.price is not None:
        payload["price"] = req.price
    if req.price_mode is not None:
        payload["price_mode"] = req.price_mode
    
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
    
    target_port = 8011 if (is_single_mode(config) or req.account_type.lower() == "long") else 8012
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
    config = load_config()
    target_port = 8011 if (is_single_mode(config) or req.account_type.lower() == "long") else 8012
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

class ModifyOrderRequest(BaseModel):
    ticket: int
    price: Optional[float] = None
    sl: Optional[float] = None
    tp: Optional[float] = None
    account_type: str

@app.post("/api/order/modify")
async def modify_order(req: ModifyOrderRequest):
    """Route order modify to correct worker."""
    config = load_config()
    target_port = 8011 if (is_single_mode(config) or req.account_type.lower() == "long") else 8012
    worker_url = f"http://127.0.0.1:{target_port}/order/modify"
    
    payload = {
        "ticket": req.ticket,
    }
    if req.price is not None:
        payload["price"] = req.price
    if req.sl is not None:
        payload["sl"] = req.sl
    if req.tp is not None:
        payload["tp"] = req.tp
        
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
    
    target_port = 8011 if (is_single_mode(config) or req.account_type.lower() == "long") else 8012
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
    return JSONResponse(
        content=load_config(),
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

class ConfigUpdateRequest(BaseModel):
    symbol: str
    terminal_path_long: str
    terminal_path_short: str
    default_lot: float
    default_sl_points: float
    default_tp_points: float
    auto_be_pips: int
    max_spread_pips: float
    key_levels: Optional[list] = None

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
        "max_spread_pips": req.max_spread_pips,
        "key_levels": req.key_levels if req.key_levels is not None else old_config.get("key_levels", [])
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
    config = load_config()
    ports = [8011] if is_single_mode(config) else [8011, 8012]
    # Try long worker first, then short worker
    for port in ports:
        try:
            url = f"http://127.0.0.1:{port}{endpoint}"
            res = await http_client.get(url, params=params, timeout=15.0)
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
        "supported_resolutions": ["100T", "200T", "400T", "1000T", "15S", "30S", "45S", "1", "2", "3", "5", "15", "30", "60", "D"]
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
        "supported_resolutions": ["100T", "200T", "400T", "1000T", "15S", "30S", "45S", "1", "2", "3", "5", "15", "30", "60", "D"]
    }

@app.get("/api/udf/history")
async def get_udf_history(symbol: str, resolution: str, from_time: int = Query(..., alias="from"), to_time: int = Query(..., alias="to")):
    config = load_config()
    if symbol.upper() != config["symbol"].upper():
        return {"s": "no_data"}
        
    res_str = resolution.upper()
    
    # 1. Handle Tick Resolutions (100T, 200T, 400T, 1000T, etc.)
    if "T" in res_str:
        try:
            n_ticks = int(res_str.replace("T", ""))
        except:
            n_ticks = 200

        now = get_current_broker_time()
        limit_seconds = 7 * 86400
        effective_from = max(from_time, now - limit_seconds)
        effective_to = min(to_time, now) if to_time > 0 else now

        symbol = config["symbol"]
        cache_key = (symbol, n_ticks)
        cached = tick_bars_cache.get(cache_key)

        fetched_candles = []
        now_wall = time.time()
        if cached and (now_wall - cached["time"] < 3):
            fetched_candles = cached["candles"]
        else:
            fetched_candles = await fetch_from_worker("/tick_bars", {
                "symbol": symbol,
                "n_ticks": n_ticks,
                "date_from": effective_from,
                "date_to": effective_to
            })
            if fetched_candles:
                tick_bars_cache[cache_key] = {"time": now_wall, "candles": fetched_candles}

        # When fetched_candles is available, it already includes the complete history
        # plus the leftover partial bar from MT5 ticks. Use it directly to prevent gaps.
        if fetched_candles:
            candles_to_use = fetched_candles
            # Synchronize quote_aggregator with MT5's actual latest tick bar
            last_c = fetched_candles[-1]
            if last_c.get("ticks", 0) < n_ticks:
                cur = quote_aggregator.current_tick_candle.get(n_ticks)
                if not cur or cur.start_time < last_c["t_start"] or (now - cur.end_time > 120):
                    new_c = Candle(last_c["t_start"], last_c["o"])
                    new_c.high = last_c["h"]
                    new_c.low = last_c["l"]
                    new_c.close = last_c["c"]
                    new_c.tick_count = last_c["ticks"]
                    new_c.active_duration = max(1, last_c.get("duration", 1))
                    new_c.end_time = last_c.get("t_end", last_c["t_start"])
                    quote_aggregator.current_tick_candle[n_ticks] = new_c
            if len(fetched_candles) > 1:
                quote_aggregator.last_completed_tick_candle[n_ticks] = fetched_candles[-2]
        else:
            deque_candles = list(quote_aggregator.tick_history.get(n_ticks, []))
            candles_to_use = list(deque_candles)
            current_candle = quote_aggregator.current_tick_candle.get(n_ticks)
            if current_candle:
                candles_to_use.append(current_candle.to_dict())

        filtered_candles = [
            c for c in sorted(candles_to_use, key=lambda x: x["t"])
            if c["t"] >= from_time
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
            "v": [c["v"] for c in filtered_candles],
            "t_start": [c.get("t_start", c["t"]) for c in filtered_candles],
            "t_end": [c.get("t_end", c["t"]) for c in filtered_candles],
            "duration": [c.get("duration", 1) for c in filtered_candles],
            "ticks": [c.get("ticks", n_ticks) for c in filtered_candles]
        }
    
    # 2. Handle standard resolutions (1, 5, 15, 30, 60, D)
    now = get_current_broker_time()
    if "S" not in res_str:
        rates = await fetch_from_worker("/rates", {
            "symbol": config["symbol"],
            "resolution": resolution,
            "date_from": from_time,
            "date_to": min(to_time, now) if to_time > 0 else now
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
        
    # 3. Handle sub-minute resolutions (15S, 30S, 45S)
    try:
        res_seconds = int(res_str.replace("S", ""))
    except:
        res_seconds = 15
        
    if res_seconds not in [15, 30, 45]:
        return {"s": "no_data"}
        
    limit_seconds = 3 * 86400
    effective_from = max(from_time, now - limit_seconds)
    effective_to = min(to_time, now) if to_time > 0 else now
    
    fetched_candles = await fetch_from_worker("/second_bars", {
        "symbol": config["symbol"],
        "seconds": res_seconds,
        "date_from": effective_from,
        "date_to": effective_to
    })
    if not fetched_candles:
        fetched_candles = []
        
    deque_candles = list(quote_aggregator.history.get(res_seconds, []))
    current_candle = quote_aggregator.current_candle.get(res_seconds)
    
    all_candles = {c["t"]: c for c in fetched_candles}
    for c in deque_candles:
        all_candles[c["t"]] = c
        
    if current_candle:
        all_candles[current_candle.time] = current_candle.to_dict()
        
    filtered_candles = [
        all_candles[t] for t in sorted(all_candles.keys())
        if t >= from_time
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
    
    # Fetch past 90 days of history
    now = int(time.time())
    days_ago = now - (90 * 24 * 3600)
    
    params = {
        "date_from": days_ago,
        "date_to": now,
        "symbol": symbol
    }
    
    deals = []
    
    # Query workers
    ports = [8011] if is_single_mode(config) else [8011, 8012]
    for port in ports:
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
            total_close_volume = sum(c["volume"] for c in close_deals)
            close_price = sum(c["price"] * c["volume"] for c in close_deals) / total_close_volume if total_close_volume > 0 else close_deals[-1]["price"]
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
    
    from datetime import datetime, timezone, timedelta
    
    MONTH_NAMES_FR = ["", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    
    daily_groups = {}
    weekly_groups = {}
    monthly_groups = {}
    
    for t in completed_trades:
        dt = datetime.fromtimestamp(t["close_time"], timezone.utc)
        d_key = dt.strftime("%Y-%m-%d")
        
        # Day
        if d_key not in daily_groups:
            daily_groups[d_key] = {"key": d_key, "date": d_key, "label": d_key, "trades": []}
        daily_groups[d_key]["trades"].append(t)
        
        # Week (Monday to Sunday)
        monday = dt.date() - timedelta(days=dt.weekday())
        sunday = monday + timedelta(days=6)
        year, week_num, _ = dt.isocalendar()
        w_key = f"{year}-W{week_num:02d}"
        w_label = f"S{week_num:02d} ({monday.strftime('%d/%m')} - {sunday.strftime('%d/%m')})"
        if w_key not in weekly_groups:
            weekly_groups[w_key] = {"key": w_key, "date": d_key, "label": w_label, "trades": []}
        weekly_groups[w_key]["trades"].append(t)
        
        # Month
        m_key = dt.strftime("%Y-%m")
        m_label = f"{MONTH_NAMES_FR[dt.month]} {dt.year}"
        if m_key not in monthly_groups:
            monthly_groups[m_key] = {"key": m_key, "date": d_key, "label": m_label, "trades": []}
        monthly_groups[m_key]["trades"].append(t)
        
    def summarize_groups(groups):
        res = []
        for k, g in groups.items():
            t_list = g["trades"]
            total_trades = len(t_list)
            winning_trades = sum(1 for x in t_list if x["category"] == "WIN")
            be_trades = sum(1 for x in t_list if x["category"] == "BE")
            losing_trades = sum(1 for x in t_list if x["category"] == "LOSS")
            
            win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0.0
            net = sum(x["net"] for x in t_list)
            pips = sum(x["pips"] for x in t_list)
            profit = sum(x["profit"] for x in t_list)
            commission = sum(x["commission"] for x in t_list)
            swap = sum(x["swap"] for x in t_list)
            
            res.append({
                "key": k,
                "label": g["label"],
                "date": g["date"],
                "trades_count": total_trades,
                "winning_count": winning_trades,
                "be_count": be_trades,
                "losing_count": losing_trades,
                "win_rate": round(win_rate, 1),
                "net": round(net, 2),
                "pips": round(pips, 1),
                "profit": round(profit, 2),
                "commission": round(commission, 2),
                "swap": round(swap, 2)
            })
        res.sort(key=lambda x: x["key"], reverse=True)
        return res

    daily_stats = summarize_groups(daily_groups)
    weekly_stats = summarize_groups(weekly_groups)
    monthly_stats = summarize_groups(monthly_groups)
    
    return {
        "trades": completed_trades,
        "stats": daily_stats,
        "daily_stats": daily_stats,
        "weekly_stats": weekly_stats,
        "monthly_stats": monthly_stats
    }

if __name__ == "__main__":
    import uvicorn
    # Main gateway runs on port 8010, binding to 0.0.0.0 to allow LAN access
    uvicorn.run(app, host="0.0.0.0", port=8010)
