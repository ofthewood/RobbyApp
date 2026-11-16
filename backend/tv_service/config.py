import os
from typing import List

# Server configuration
TV_PORT: int = int(os.getenv("TV_PORT", "8020"))
TV_HOST: str = os.getenv("TV_HOST", "0.0.0.0")

# Security token expected in TradingView Webhook payloads
# Ex: {"secret": "scalp_tv_secure_2026", ...} or Authorization header
TV_WEBHOOK_SECRET: str = os.getenv("TV_WEBHOOK_SECRET", "scalp_tv_secure_2026")

# Default 6 indices
DEFAULT_SYMBOLS: List[str] = [
    "GER40",
    "NAS100",
    "USA500",
    "SPX500",
    "US30",
    "FRA40",
    "UK100"
]

# Default 10 timeframes
DEFAULT_TIMEFRAMES: List[str] = [
    "1m",
    "2m",
    "3m",
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "4h",
    "D",
    "W"
]

# Database path for alerting history and metrics storage
ROOT_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH: str = os.getenv("TV_DB_PATH", os.path.join(ROOT_DIR, "tv_data.db"))

# In-memory history length per symbol+timeframe (number of updates kept in RAM)
HISTORY_MAX_LEN: int = 100

# Alerting cooldown in seconds (minimum time before same rule re-alerts for same symbol/tf)
ALERT_DEFAULT_COOLDOWN_SEC: int = 120

# Rolling data retention policy in days (default: 5 days rolling purge)
RETENTION_DAYS: int = int(os.getenv("TV_RETENTION_DAYS", "5"))
