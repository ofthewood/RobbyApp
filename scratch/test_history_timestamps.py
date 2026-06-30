import requests
import json
from datetime import datetime

url = "http://localhost:8010/api/history"

try:
    r = requests.get(url)
    data = r.json()
    trades = data.get("trades", [])
    
    # Filter for 2026-06-29
    # close_time is unix timestamp. 2026-06-29 is 1782684000 to 1782770400 (UTC)
    day_trades = []
    for t in trades:
        dt = datetime.fromtimestamp(t["close_time"])
        if dt.strftime("%Y-%m-%d") == "2026-06-29":
            day_trades.append(t)
            
    print(f"Total trades on 2026-06-29: {len(day_trades)}")
    if len(day_trades) > 0:
        first = day_trades[0]
        last = day_trades[-1]
        print("First trade open_time:", first["open_time"], "close_time:", first["close_time"])
        print("First trade open_dt:", datetime.fromtimestamp(first["open_time"]), "close_dt:", datetime.fromtimestamp(first["close_time"]))
        print("Last trade open_time:", last["open_time"], "close_time:", last["close_time"])
        print("Last trade open_dt:", datetime.fromtimestamp(last["open_time"]), "close_dt:", datetime.fromtimestamp(last["close_time"]))
except Exception as e:
    print("Error:", e)
