import requests
import json
import time

url = "http://localhost:8010/api/udf/history"

# Let's check yesterday 2026-06-29.
# The user's local time is 2026-06-30. So 2026-06-29 was yesterday.
# Let's get the timestamps for 2026-06-29 08:00 to 18:00 Paris time (UTC+2)
# 2026-06-29 08:00:00 Paris = 2026-06-29 06:00:00 UTC = 1782712800
# 2026-06-29 18:00:00 Paris = 2026-06-29 16:00:00 UTC = 1782748800

params = {
    "symbol": "GER40",
    "resolution": "1",
    "from": 1782712800,
    "to": 1782748800
}

try:
    r = requests.get(url, params=params)
    print("Status code:", r.status_code)
    data = r.json()
    print("Response keys:", list(data.keys()))
    print("Response status 's':", data.get("s"))
    if "t" in data:
        print("Number of candles received:", len(data["t"]))
        if len(data["t"]) > 0:
            print("First candle time:", data["t"][0])
            print("Last candle time:", data["t"][-1])
    else:
        print("Response data:", data)
except Exception as e:
    print("Error:", e)
