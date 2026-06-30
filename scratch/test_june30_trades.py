import requests
from datetime import datetime, timezone

url = "http://localhost:8010/api/history"

try:
    r = requests.get(url)
    data = r.json()
    trades = data.get("trades", [])
    
    # Filter for 2026-06-30
    june30_trades = []
    for t in trades:
        dt = datetime.fromtimestamp(t["close_time"], timezone.utc)
        if dt.strftime("%Y-%m-%d") == "2026-06-30":
            june30_trades.append(t)
            
    print(f"Total trades on 2026-06-30 in backend: {len(june30_trades)}")
    if len(june30_trades) > 0:
        first = june30_trades[0]
        print("First trade close_time:", first["close_time"])
        # Format in UTC
        dt_utc = datetime.fromtimestamp(first["close_time"], timezone.utc)
        print("First trade UTC date:", dt_utc.strftime("%Y-%m-%d %H:%M:%S"))
        # Format in local
        dt_local = datetime.fromtimestamp(first["close_time"])
        print("First trade Local date:", dt_local.strftime("%Y-%m-%d %H:%M:%S"))
        
        # Let's print the first 5 trades details
        for i, t in enumerate(june30_trades[:5]):
            print(f"Trade {i}: open_time={t['open_time']}, close_time={t['close_time']}, type={t['type']}, net={t['net']}")
except Exception as e:
    print("Error:", e)
