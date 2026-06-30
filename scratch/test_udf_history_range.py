import requests

url = "http://localhost:8010/api/udf/history"
params = {
    "symbol": "GER40",
    "resolution": "1",
    "from": 1782723367,
    "to": 1782759416
}

try:
    r = requests.get(url, params=params)
    print("Status:", r.status_code)
    data = r.json()
    print("Response status 's':", data.get("s"))
    if "t" in data:
        print("Number of candles:", len(data["t"]))
    else:
        print("Data:", data)
except Exception as e:
    print("Error:", e)
