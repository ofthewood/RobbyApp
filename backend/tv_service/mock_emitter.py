"""
Mock TradingView Webhook Emitter.
Simulates TradingView sending live payloads for the 6 indices and 10 timeframes with 30 indicator values.
Usage: python -m backend.tv_service.mock_emitter [--burst] [--loop]
"""

import time
import random
import argparse
import requests

from .config import TV_PORT, TV_WEBHOOK_SECRET, DEFAULT_SYMBOLS, DEFAULT_TIMEFRAMES

SERVER_URL = f"http://127.0.0.1:{TV_PORT}/api/v1/webhook"

def generate_30_metrics(symbol: str, tf: str) -> dict:
    """Generates 30 synthetic technical indicators."""
    price_base = {
        "GER40": 19400.0,
        "US30": 43500.0,
        "NAS100": 20800.0,
        "SPX500": 5850.0,
        "FRA40": 7450.0,
        "UK100": 8200.0
    }.get(symbol, 10000.0)

    price = round(price_base + random.uniform(-50, 50), 2)
    rsi = round(random.uniform(25, 80), 1)
    trend = "bullish" if rsi > 52 else ("bearish" if rsi < 48 else "neutral")
    score = round((rsi - 50) / 3.0 + random.uniform(-1, 1), 1)

    return {
        # 1. Price & Volatility
        "close": price,
        "high": round(price + random.uniform(5, 20), 2),
        "low": round(price - random.uniform(5, 20), 2),
        "atr_14": round(random.uniform(10, 45), 2),
        "volatility_pct": round(random.uniform(0.5, 2.5), 2),
        
        # 2. Momentum & Oscillators
        "rsi": rsi,
        "rsi_ma": round(rsi + random.uniform(-3, 3), 1),
        "stoch_k": round(random.uniform(10, 90), 1),
        "stoch_d": round(random.uniform(10, 90), 1),
        "cci": round(random.uniform(-150, 150), 1),
        "williams_r": round(random.uniform(-90, -10), 1),
        
        # 3. Trend & Moving Averages
        "trend": trend,
        "score": score,
        "ema_9": round(price + random.uniform(-5, 5), 2),
        "ema_21": round(price + random.uniform(-10, 10), 2),
        "ema_50": round(price + random.uniform(-20, 20), 2),
        "ema_200": round(price + random.uniform(-40, 40), 2),
        "supertrend_val": round(price - 15 if trend == "bullish" else price + 15, 2),
        "supertrend_dir": 1 if trend == "bullish" else -1,
        
        # 4. MACD & Direction
        "macd_line": round(random.uniform(-15, 15), 2),
        "macd_signal": round(random.uniform(-15, 15), 2),
        "macd_hist": round(random.uniform(-5, 5), 2),
        "adx_14": round(random.uniform(12, 45), 1),
        
        # 5. Bollinger Bands
        "bb_upper": round(price + random.uniform(15, 30), 2),
        "bb_middle": round(price, 2),
        "bb_lower": round(price - random.uniform(15, 30), 2),
        "bb_bandwidth": round(random.uniform(1.2, 4.0), 2),
        
        # 6. Volume & Market Profile / Support-Resistance
        "volume_rel": round(random.uniform(0.6, 2.4), 2),
        "pivot_sup1": round(price - 25, 2),
        "pivot_res1": round(price + 25, 2)
    }

def send_update(symbol: str, tf: str):
    metrics = generate_30_metrics(symbol, tf)
    payload = {
        "secret": TV_WEBHOOK_SECRET,
        "symbol": symbol,
        "tf": tf,
        "time": time.time(),
        "metrics": metrics
    }
    try:
        r = requests.post(SERVER_URL, json=payload, timeout=3.0)
        print(f"[{time.strftime('%H:%M:%S')}] Emitted {symbol} {tf:3s} | HTTP {r.status_code} | RSI: {metrics['rsi']:4.1f} | Score: {metrics['score']:4.1f} | {r.json()}")
    except Exception as e:
        print(f"Error emitting {symbol} {tf}: {e}")

def run_burst():
    print(f"Sending full matrix burst (6 symbols x 10 TFs = 60 updates)...")
    for sym in DEFAULT_SYMBOLS:
        for tf in DEFAULT_TIMEFRAMES:
            send_update(sym, tf)
            time.sleep(0.05)

def run_loop(interval_sec: float = 2.0):
    print(f"Starting continuous emitter loop (interval: {interval_sec}s)...")
    while True:
        sym = random.choice(DEFAULT_SYMBOLS)
        tf = random.choice(DEFAULT_TIMEFRAMES)
        send_update(sym, tf)
        time.sleep(interval_sec)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--burst", action="store_true", help="Send complete matrix at once")
    parser.add_argument("--loop", action="store_true", help="Continuous streaming updates")
    parser.add_argument("--interval", type=float, default=2.0, help="Interval between updates in loop mode")
    args = parser.parse_args()

    if args.burst:
        run_burst()
    elif args.loop:
        run_loop(args.interval)
    else:
        # Default: single burst
        run_burst()
