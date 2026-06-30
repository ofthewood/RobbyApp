import MetaTrader5 as mt5
import time
import os

# Initialize MT5
path_long = r"C:\Program Files\ActivTrades  MT5Bull\terminal64.exe"
if mt5.initialize(path=path_long):
    print("MT5 Long initialized successfully.")
    
    mt5.symbol_select("GER40", True)
    tick = mt5.symbol_info_tick("GER40")
    if tick:
        print("Tick time (broker timestamp):", tick.time)
        import datetime
        print("Tick time formatted (naive):", datetime.datetime.fromtimestamp(tick.time, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"))
        
        current_utc = int(time.time())
        print("Current UTC timestamp:", current_utc)
        print("Current UTC formatted:", datetime.datetime.fromtimestamp(current_utc, datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"))
        
        diff = tick.time - current_utc
        print("Raw difference (broker - UTC):", diff)
        print("Offset (rounded to 15 mins):", round(diff / 900) * 900)
    else:
        print("Failed to get tick info.")
    mt5.shutdown()
else:
    print("Failed to initialize MT5.")
