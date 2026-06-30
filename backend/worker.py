import sys
import os
import argparse
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import MetaTrader5 as mt5

# Create FastAPI app
app = FastAPI()

# Add CORS middleware to allow the gateway server to communicate easily
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Parse command line args or set default values
# Since we will run worker.py as a script via subprocess, we parse port, path, and account type.
parser = argparse.ArgumentParser(description="MT5 Worker")
parser.add_argument("--port", type=int, default=8011)
parser.add_argument("--path", type=str, required=True, help="Path to terminal64.exe")
parser.add_argument("--type", type=str, choices=["long", "short"], required=True)
# Allow parse unknown args to avoid issues if run from uvicorn directly
args, unknown = parser.parse_known_args()

PORT = args.port
TERMINAL_PATH = args.path
ACCOUNT_TYPE = args.type

# Global connection status
initialized = False

def get_filling_type(symbol):
    """Dynamically determine correct order filling type for the broker/symbol using integer bitmasks."""
    info = mt5.symbol_info(symbol)
    if info is None:
        return mt5.ORDER_FILLING_FOK
    
    filling_mode = info.filling_mode
    # Bitmask values: 1 = FOK (Fill or Kill), 2 = IOC (Immediate or Cancel)
    if filling_mode & 1:
        return mt5.ORDER_FILLING_FOK
    elif filling_mode & 2:
        return mt5.ORDER_FILLING_IOC
    else:
        return mt5.ORDER_FILLING_RETURN

def get_timezone_offset(symbol: str) -> int:
    """Calculate the timezone offset between the MT5 broker terminal time and UTC in seconds,
    using a local cache file to persist the offset during weekends/market closure."""
    import time
    import json
    import os
    
    cache_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "timezone_offset_cache.json")
    
    # Try to load cached offset first as a fallback
    cached_offset = None
    if os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                cached_offset = data.get("offset")
        except Exception:
            pass

    # Query active symbols to find the most recent tick
    test_symbols = [symbol, "EURUSD", "USDJPY", "GBPUSD"]
    max_tick_time = 0
    
    for ts in test_symbols:
        mt5.symbol_select(ts, True)
        tick = mt5.symbol_info_tick(ts)
        if tick:
            if tick.time > max_tick_time:
                max_tick_time = tick.time
                
    if max_tick_time == 0:
        return cached_offset if cached_offset is not None else 7200
        
    current_time = int(time.time())
    
    # If the tick is fresh (less than 14 hours difference from UTC), compute and cache the offset
    if abs(max_tick_time - current_time) < 14 * 3600:
        diff = max_tick_time - current_time
        offset = round(diff / 900) * 900
        
        # Save to cache
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump({"offset": offset, "updated_at": current_time}, f)
        except Exception as e:
            print(f"Error saving timezone offset cache: {e}")
        return offset
        
    return cached_offset if cached_offset is not None else 7200

@app.on_event("startup")
async def startup_event():
    global initialized
    print(f"Starting worker for {ACCOUNT_TYPE.upper()} on port {PORT}")
    print(f"Connecting to MT5 terminal at: {TERMINAL_PATH}")
    
    # Initialize connection to the specific MT5 terminal
    if mt5.initialize(path=TERMINAL_PATH):
        initialized = True
        print(f"Successfully connected to MT5 ({ACCOUNT_TYPE})")
    else:
        initialized = False
        print(f"Failed to connect to MT5 ({ACCOUNT_TYPE}). Error: {mt5.last_error()}")

@app.on_event("shutdown")
async def shutdown_event():
    print(f"Shutting down worker {ACCOUNT_TYPE}...")
    mt5.shutdown()

@app.get("/status")
async def get_status():
    global initialized
    if not initialized:
        # Retry initialization in case it failed previously (e.g. terminal was closed)
        if mt5.initialize(path=TERMINAL_PATH):
            initialized = True
        else:
            return {
                "connected": False,
                "error": f"Failed to initialize: {mt5.last_error()}",
                "account_info": None
            }
            
    acc = mt5.account_info()
    if acc is None:
        return {
            "connected": False,
            "error": f"Failed to get account info: {mt5.last_error()}",
            "account_info": None
        }
        
    return {
        "connected": True,
        "account_type": ACCOUNT_TYPE,
        "account_info": {
            "login": acc.login,
            "trade_mode": acc.trade_mode,
            "limit_orders": acc.limit_orders,
            "margin_so_mode": acc.margin_so_mode,
            "trade_allowed": acc.trade_allowed,
            "trade_expert": acc.trade_expert,
            "margin_mode": acc.margin_mode,
            "currency": acc.currency,
            "balance": acc.balance,
            "credit": acc.credit,
            "profit": acc.profit,
            "equity": acc.equity,
            "margin": acc.margin,
            "margin_free": acc.margin_free,
            "margin_level": acc.margin_level,
            "leverage": acc.leverage,
            "name": acc.name,
            "server": acc.server,
            "company": acc.company
        }
    }

@app.get("/quote")
async def get_quote(symbol: str = "GER40"):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    # Ensure symbol is selected in MarketWatch
    mt5.symbol_select(symbol, True)
    
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        # Check if symbol exists at all
        sym_info = mt5.symbol_info(symbol)
        if sym_info is None:
            raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' not found on broker")
        raise HTTPException(status_code=500, detail=f"No quotes available for '{symbol}'")
        
    offset = get_timezone_offset(symbol)
    return {
        "symbol": symbol,
        "bid": tick.bid,
        "ask": tick.ask,
        "time": int(tick.time) - offset,
        "time_msc": int(tick.time_msc) - (offset * 1000),
        "volume": tick.volume,
    }

@app.get("/positions")
async def get_positions(symbol: str = "GER40"):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    # Retrieve open positions for this symbol
    positions = mt5.positions_get(symbol=symbol)
    if positions is None:
        return []
        
    result = []
    for pos in positions:
        result.append({
            "ticket": pos.ticket,
            "time": pos.time,
            "time_msc": pos.time_msc,
            "type": "BUY" if pos.type == mt5.POSITION_TYPE_BUY else "SELL",
            "magic": pos.magic,
            "identifier": pos.identifier,
            "reason": pos.reason,
            "volume": pos.volume,
            "price_open": pos.price_open,
            "sl": pos.sl,
            "tp": pos.tp,
            "price_current": pos.price_current,
            "swap": pos.swap,
            "profit": pos.profit,
            "symbol": pos.symbol,
            "comment": pos.comment,
            "account_type": ACCOUNT_TYPE
        })
    return result

@app.get("/orders")
async def get_orders(symbol: str = "GER40"):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    orders = mt5.orders_get(symbol=symbol)
    if orders is None:
        return []
        
    tick = mt5.symbol_info_tick(symbol)
    bid = tick.bid if tick else 0.0
    ask = tick.ask if tick else 0.0
    
    result = []
    for ord in orders:
        ord_type = "BUY"
        is_buy = True
        if ord.type == mt5.ORDER_TYPE_BUY_LIMIT:
            ord_type = "BUY LIMIT"
        elif ord.type == mt5.ORDER_TYPE_SELL_LIMIT:
            ord_type = "SELL LIMIT"
            is_buy = False
        elif ord.type == mt5.ORDER_TYPE_BUY_STOP:
            ord_type = "BUY STOP"
        elif ord.type == mt5.ORDER_TYPE_SELL_STOP:
            ord_type = "SELL STOP"
            is_buy = False
        elif ord.type == mt5.ORDER_TYPE_BUY_STOP_LIMIT:
            ord_type = "BUY STOP LMT"
        elif ord.type == mt5.ORDER_TYPE_SELL_STOP_LIMIT:
            ord_type = "SELL STOP LMT"
            is_buy = False
        else:
            is_buy = ord.type in [0, 2, 4]
            ord_type = "BUY" if is_buy else "SELL"
            
        price_current = ask if is_buy else bid
        
        result.append({
            "ticket": ord.ticket,
            "time_setup": ord.time_setup,
            "time_setup_msc": ord.time_setup_msc,
            "type": ord_type,
            "magic": ord.magic,
            "volume": ord.volume_initial,
            "price_open": ord.price_open,
            "sl": ord.sl,
            "tp": ord.tp,
            "price_current": price_current,
            "symbol": ord.symbol,
            "comment": ord.comment,
            "account_type": ACCOUNT_TYPE
        })
    return result

class CancelOrderRequest(BaseModel):
    ticket: int

@app.post("/order/cancel")
async def cancel_order(req: CancelOrderRequest):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    trade_req = {
        "action": mt5.TRADE_ACTION_REMOVE,
        "order": int(req.ticket)
    }
    
    res = mt5.order_send(trade_req)
    if res is None:
        raise HTTPException(status_code=500, detail=f"Failed to cancel order. Error: {mt5.last_error()}")
        
    if res.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(
            status_code=400, 
            detail=f"Cancel request rejected: {res.comment} (Code: {res.retcode})"
        )
        
    return {
        "success": True,
        "ticket": res.order,
        "comment": res.comment,
        "retcode": res.retcode
    }

class ModifyOrderRequest(BaseModel):
    ticket: int
    price: Optional[float] = None
    sl: Optional[float] = None
    tp: Optional[float] = None

@app.post("/order/modify")
async def modify_order(req: ModifyOrderRequest):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    orders = mt5.orders_get(ticket=req.ticket)
    if orders is None or len(orders) == 0:
        raise HTTPException(status_code=404, detail=f"Pending order ticket {req.ticket} not found")
        
    ord_info = orders[0]
    
    trade_req = {
        "action": mt5.TRADE_ACTION_MODIFY,
        "order": int(req.ticket),
        "price": float(req.price) if req.price is not None else float(ord_info.price_open),
        "sl": float(req.sl) if req.sl is not None else float(ord_info.sl),
        "tp": float(req.tp) if req.tp is not None else float(ord_info.tp)
    }
    
    res = mt5.order_send(trade_req)
    if res is None:
        raise HTTPException(status_code=500, detail=f"Failed to modify order. Error: {mt5.last_error()}")
        
    if res.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(
            status_code=400, 
            detail=f"Modify order request rejected: {res.comment} (Code: {res.retcode})"
        )
        
    return {
        "success": True,
        "ticket": res.order,
        "comment": res.comment,
        "retcode": res.retcode
    }

def get_pip_size(symbol):
    """Determine pip/point size for distance computations (1.0 for indices, 0.0001 forex, 0.01 JPY)."""
    info = mt5.symbol_info(symbol)
    if info is None:
        return 1.0
    name = symbol.upper()
    if "JPY" in name:
        return 0.01
    if any(x in name for x in ["GER", "DE", "FRA", "CAC", "US", "NAS", "SP", "HK", "UK", "ESTX", "ESP"]):
        return 1.0
    if info.digits >= 4:
        return 0.0001
    return 1.0

class OrderRequest(BaseModel):
    symbol: str
    action: str  # "BUY" or "SELL"
    volume: float
    sl_points: float = 0.0
    tp_points: float = 0.0
    price: Optional[float] = None

@app.post("/order")
async def place_order(req: OrderRequest):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    # Select symbol
    mt5.symbol_select(req.symbol, True)
    
    tick = mt5.symbol_info_tick(req.symbol)
    if tick is None:
        raise HTTPException(status_code=400, detail=f"Cannot fetch current tick for {req.symbol}")
        
    is_pending = req.price is not None and req.price > 0
    
    if is_pending:
        price = float(req.price)
        if req.action.upper() == "BUY":
            order_type = mt5.ORDER_TYPE_BUY_LIMIT if price < tick.ask else mt5.ORDER_TYPE_BUY_STOP
        elif req.action.upper() == "SELL":
            order_type = mt5.ORDER_TYPE_SELL_LIMIT if price > tick.bid else mt5.ORDER_TYPE_SELL_STOP
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Must be BUY or SELL")
    else:
        if req.action.upper() == "BUY":
            order_type = mt5.ORDER_TYPE_BUY
            price = tick.ask
        elif req.action.upper() == "SELL":
            order_type = mt5.ORDER_TYPE_SELL
            price = tick.bid
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Must be BUY or SELL")
            
    pip_size = get_pip_size(req.symbol)
    
    # Calculate SL and TP
    sl = 0.0
    tp = 0.0
    
    if req.sl_points > 0:
        if req.action.upper() == "BUY":
            sl = price - (req.sl_points * pip_size)
        else:
            sl = price + (req.sl_points * pip_size)
            
    if req.tp_points > 0:
        if req.action.upper() == "BUY":
            tp = price + (req.tp_points * pip_size)
        else:
            tp = price - (req.tp_points * pip_size)

    filling_type = get_filling_type(req.symbol)
    magic_num = 10111 if ACCOUNT_TYPE == "long" else 10112

    # Prepare request
    trade_req = {
        "action": mt5.TRADE_ACTION_PENDING if is_pending else mt5.TRADE_ACTION_DEAL,
        "symbol": req.symbol,
        "volume": req.volume,
        "type": order_type,
        "price": price,
        "sl": float(sl) if sl > 0 else 0.0,
        "tp": float(tp) if tp > 0 else 0.0,
        "deviation": 20,
        "magic": magic_num,
        "comment": f"Scalp Web {ACCOUNT_TYPE}",
        "type_filling": filling_type,
        "type_time": mt5.ORDER_TIME_GTC
    }
    
    print(f"[{ACCOUNT_TYPE.upper()}] Order Request: {req}")
    print(f"[{ACCOUNT_TYPE.upper()}] Preparing trade_req: {trade_req}")
    
    # Send order
    res = mt5.order_send(trade_req)
    print(f"[{ACCOUNT_TYPE.upper()}] Order result: {res._asdict() if res else None}")
    
    if res is None:
        raise HTTPException(status_code=500, detail=f"Failed to submit order. mt5.order_send returned None. Error: {mt5.last_error()}")
        
    if res.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(
            status_code=400, 
            detail=f"Trade rejected: {res.comment} (Code: {res.retcode})"
        )
        
    return {
        "success": True,
        "ticket": res.order,
        "price": res.price,
        "volume": res.volume,
        "comment": res.comment,
        "retcode": res.retcode
    }

class CloseRequest(BaseModel):
    ticket: int
    symbol: str
    volume: float

@app.post("/position/close")
async def close_position(req: CloseRequest):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    # Get the position details to determine its type
    positions = mt5.positions_get(ticket=req.ticket)
    if positions is None or len(positions) == 0:
        raise HTTPException(status_code=404, detail=f"Position ticket {req.ticket} not found on this account")
        
    pos = positions[0]
    
    # Opposite order type to close
    if pos.type == mt5.POSITION_TYPE_BUY:
        close_type = mt5.ORDER_TYPE_SELL
        price = mt5.symbol_info_tick(req.symbol).bid
    else:
        close_type = mt5.ORDER_TYPE_BUY
        price = mt5.symbol_info_tick(req.symbol).ask
        
    filling_type = get_filling_type(req.symbol)
    magic_num = pos.magic

    trade_req = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": req.symbol,
        "volume": float(req.volume),
        "type": close_type,
        "position": int(req.ticket),
        "price": price,
        "deviation": 20,
        "magic": magic_num,
        "comment": "Close via Scalp Web",
        "type_filling": filling_type,
        "type_time": mt5.ORDER_TIME_GTC
    }
    
    res = mt5.order_send(trade_req)
    if res is None:
        raise HTTPException(status_code=500, detail=f"Failed to close. mt5.order_send returned None. Error: {mt5.last_error()}")
        
    if res.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(
            status_code=400, 
            detail=f"Close request rejected: {res.comment} (Code: {res.retcode})"
        )
        
    return {
        "success": True,
        "ticket": res.order,
        "price": res.price,
        "volume": res.volume,
        "comment": res.comment,
        "retcode": res.retcode
    }

class ModifyRequest(BaseModel):
    ticket: int
    symbol: str
    sl: float
    tp: float

@app.post("/position/modify")
async def modify_position(req: ModifyRequest):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    # Check if position exists
    positions = mt5.positions_get(ticket=req.ticket)
    if positions is None or len(positions) == 0:
        raise HTTPException(status_code=404, detail=f"Position ticket {req.ticket} not found on this account")
        
    trade_req = {
        "action": mt5.TRADE_ACTION_SLTP,
        "position": int(req.ticket),
        "symbol": req.symbol,
        "sl": float(req.sl),
        "tp": float(req.tp)
    }
    
    res = mt5.order_send(trade_req)
    if res is None:
        raise HTTPException(status_code=500, detail=f"Failed to modify. mt5.order_send returned None. Error: {mt5.last_error()}")
        
    if res.retcode != mt5.TRADE_RETCODE_DONE:
        raise HTTPException(
            status_code=400, 
            detail=f"Modify request rejected: {res.comment} (Code: {res.retcode})"
        )
        
    return {
        "success": True,
        "comment": res.comment,
        "retcode": res.retcode
    }

@app.get("/ticks")
async def get_ticks(symbol: str, date_from: int, date_to: int):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    mt5.symbol_select(symbol, True)
    
    offset = get_timezone_offset(symbol)
    broker_from = date_from + offset
    broker_to = date_to + offset
    
    import datetime
    dt_from = datetime.datetime.fromtimestamp(broker_from, datetime.timezone.utc)
    dt_to = datetime.datetime.fromtimestamp(broker_to, datetime.timezone.utc)
    
    ticks = mt5.copy_ticks_range(symbol, dt_from, dt_to, mt5.COPY_TICKS_ALL)
    if ticks is None:
        return []
        
    result = []
    for t in ticks:
        # Access numpy structured array elements using dictionary-like indexing
        result.append({
            "t": int(t['time']) - offset,
            "m": int(t['time_msc']) - (offset * 1000),
            "b": float(t['bid']),
            "a": float(t['ask']),
            "l": float(t['last']) if 'last' in t.dtype.names else 0.0,
            "v": float(t['volume']) if 'volume' in t.dtype.names else 0.0
        })
    return result

@app.get("/rates")
async def get_rates(symbol: str, resolution: str, date_from: int, date_to: int):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    mt5.symbol_select(symbol, True)
    
    tf = None
    res = resolution.upper()
    if res == "1":
        tf = mt5.TIMEFRAME_M1
    elif res == "2":
        tf = mt5.TIMEFRAME_M2
    elif res == "3":
        tf = mt5.TIMEFRAME_M3
    elif res == "5":
        tf = mt5.TIMEFRAME_M5
    elif res == "15":
        tf = mt5.TIMEFRAME_M15
    elif res == "30":
        tf = mt5.TIMEFRAME_M30
    elif res == "60" or res == "1H":
        tf = mt5.TIMEFRAME_H1
    elif res == "D" or res == "1D":
        tf = mt5.TIMEFRAME_D1
        
    if tf is None:
        raise HTTPException(status_code=400, detail=f"Unsupported resolution: {resolution}")
        
    offset = get_timezone_offset(symbol)
    broker_from = date_from + offset
    broker_to = date_to + offset
    
    import datetime
    dt_from = datetime.datetime.fromtimestamp(broker_from, datetime.timezone.utc)
    dt_to = datetime.datetime.fromtimestamp(broker_to, datetime.timezone.utc)
    
    rates = mt5.copy_rates_range(symbol, tf, dt_from, dt_to)
    if rates is None:
        return []
        
    result = []
    for r in rates:
        # Access numpy structured array elements using dictionary-like indexing
        result.append({
            "t": int(r['time']) - offset,
            "o": float(r['open']),
            "h": float(r['high']),
            "l": float(r['low']),
            "c": float(r['close']),
            "v": float(r['tick_volume'])
        })
    return result

@app.get("/history")
async def get_history(date_from: int, date_to: int, symbol: str):
    global initialized
    if not initialized:
        raise HTTPException(status_code=503, detail="MT5 terminal not connected")
        
    mt5.symbol_select(symbol, True)
    
    offset = get_timezone_offset(symbol)
    broker_from = date_from + offset
    broker_to = date_to + offset
    
    import datetime
    dt_from = datetime.datetime.fromtimestamp(broker_from, datetime.timezone.utc)
    dt_to = datetime.datetime.fromtimestamp(broker_to, datetime.timezone.utc)
    
    deals = mt5.history_deals_get(dt_from, dt_to)
    if deals is None:
        return []
        
    result = []
    for d in deals:
        try:
            d_sym = getattr(d, 'symbol', '')
            # We only want trades of the selected symbol (excluding balance records of other symbols)
            if d_sym != '' and d_sym.upper() != symbol.upper():
                continue
                
            result.append({
                "ticket": int(d.ticket),
                "order": int(d.order),
                "time": int(d.time) - offset,
                "time_msc": int(d.time_msc) - (offset * 1000),
                "type": int(d.type),
                "entry": int(d.entry),
                "magic": int(d.magic),
                "position_id": int(d.position_id),
                "volume": float(d.volume),
                "price": float(d.price),
                "commission": float(d.commission),
                "swap": float(d.swap),
                "profit": float(d.profit),
                "symbol": d_sym,
                "comment": getattr(d, 'comment', '')
            })
        except AttributeError as e:
            continue
    return result

if __name__ == "__main__":
    import uvicorn
    # This block allows running worker.py directly using python backend/worker.py ...
    uvicorn.run(app, host="127.0.0.1", port=PORT)
