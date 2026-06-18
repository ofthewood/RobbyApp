import sys
import datetime
import MetaTrader5 as mt5

TERMINAL_PATH = "C:/Program Files/ActivTrades  MT5Bull/terminal64.exe"
SYMBOL = "Ger40"

print("Connecting to MT5 terminal...")
if not mt5.initialize(path=TERMINAL_PATH):
    print("Failed to initialize MT5:", mt5.last_error())
    sys.exit(1)

print("Successfully connected to MT5.")

# Check symbol info
info = mt5.symbol_info(SYMBOL)
if info is None:
    print(f"Error: Symbol {SYMBOL} not found in MT5!")
else:
    print(f"Symbol {SYMBOL} info: bid={info.bid}, ask={info.ask}, path={info.path}")

# Test times
now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
from_ts = now_ts - 4 * 3600

print(f"Timestamps: from={from_ts}, to={now_ts}")

# Test 1: Timezone-aware UTC datetimes
dt_from_utc = datetime.datetime.fromtimestamp(from_ts, datetime.timezone.utc)
dt_to_utc = datetime.datetime.fromtimestamp(now_ts, datetime.timezone.utc)
print(f"UTC datetimes: from={dt_from_utc}, to={dt_to_utc}")

ticks_utc = mt5.copy_ticks_range(SYMBOL, dt_from_utc, dt_to_utc, mt5.COPY_TICKS_ALL)
rates_utc = mt5.copy_rates_range(SYMBOL, mt5.TIMEFRAME_M1, dt_from_utc, dt_to_utc)

print(f"UTC Aware: Ticks count = {len(ticks_utc) if ticks_utc is not None else 'None'}, Rates count = {len(rates_utc) if rates_utc is not None else 'None'}")
if ticks_utc is None:
    print("UTC Aware ticks error:", mt5.last_error())
if rates_utc is None:
    print("UTC Aware rates error:", mt5.last_error())

# Test 2: Naive datetimes (assumed local by MT5)
dt_from_naive = datetime.datetime.fromtimestamp(from_ts)
dt_to_naive = datetime.datetime.fromtimestamp(now_ts)
print(f"Naive local datetimes: from={dt_from_naive}, to={dt_to_naive}")

ticks_naive = mt5.copy_ticks_range(SYMBOL, dt_from_naive, dt_to_naive, mt5.COPY_TICKS_ALL)
rates_naive = mt5.copy_rates_range(SYMBOL, mt5.TIMEFRAME_M1, dt_from_naive, dt_to_naive)

print(f"Naive local: Ticks count = {len(ticks_naive) if ticks_naive is not None else 'None'}, Rates count = {len(rates_naive) if rates_naive is not None else 'None'}")
if ticks_naive is None:
    print("Naive ticks error:", mt5.last_error())
if rates_naive is None:
    print("Naive rates error:", mt5.last_error())

# Test 3: Naive UTC datetimes (manually converted to UTC time but without timezone info)
dt_from_utc_naive = datetime.datetime.fromtimestamp(from_ts, datetime.timezone.utc).replace(tzinfo=None)
dt_to_utc_naive = datetime.datetime.fromtimestamp(now_ts, datetime.timezone.utc).replace(tzinfo=None)
print(f"Naive UTC datetimes: from={dt_from_utc_naive}, to={dt_to_utc_naive}")

ticks_utc_naive = mt5.copy_ticks_range(SYMBOL, dt_from_utc_naive, dt_to_utc_naive, mt5.COPY_TICKS_ALL)
rates_utc_naive = mt5.copy_rates_range(SYMBOL, mt5.TIMEFRAME_M1, dt_from_utc_naive, dt_to_utc_naive)

print(f"Naive UTC: Ticks count = {len(ticks_utc_naive) if ticks_utc_naive is not None else 'None'}, Rates count = {len(rates_utc_naive) if rates_utc_naive is not None else 'None'}")

mt5.shutdown()
