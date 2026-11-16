import time
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field

def normalize_timeframe(interval: Optional[str]) -> str:
    """Normalizes Pine Script timeframe periods (e.g., '1', '60', '240') to standard '1m', '1h', '4h'."""
    if not interval:
        return "1m"
    s = str(interval).strip()
    mapping = {
        "1": "1m", "2": "2m", "3": "3m", "5": "5m", "15": "15m", "30": "30m", "45": "45m",
        "60": "1h", "120": "2h", "180": "3h", "240": "4h",
        "D": "D", "1D": "D", "W": "W", "1W": "W", "M": "M", "1M": "M"
    }
    return mapping.get(s, s if (s.endswith("m") or s.endswith("h") or s in ["D", "W", "M"]) else f"{s}m")

def normalize_symbol(sym: Optional[str]) -> str:
    """Extracts raw symbol name without broker prefix (e.g. 'ACTIVTRADES:GER40' -> 'GER40')."""
    if not sym:
        return "UNKNOWN"
    s = str(sym).strip().upper()
    if ":" in s:
        s = s.split(":")[-1]
    if s in ["SPX500", "US500", "SP500"]:
        return "USA500"
    return s


class TVWebhookPayload(BaseModel):
    """
    Flexible incoming payload from TradingView alerts.
    Directly compatible with 'Connecteur Webhook PRO Framework - V5.2.1'
    and custom Pine Script formats.
    """
    symbol: Optional[str] = None
    ticker: Optional[str] = None
    
    tf: Optional[str] = None
    interval: Optional[str] = None
    
    time: Optional[Union[int, float, str]] = None
    timestamp: Optional[Union[int, float, str]] = None
    timenow: Optional[Union[int, float, str]] = None
    
    # Root price fields
    price: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None

    # PRO Framework (33 fields) & PRO Momentum (24 fields) groups
    framework: Optional[Dict[str, Any]] = None
    momentum: Optional[Dict[str, Any]] = None

    # Generic or multi-TF payloads
    metrics: Optional[Dict[str, Any]] = None
    timeframes: Optional[Dict[str, Dict[str, Any]]] = None
    secret: Optional[str] = None

    class Config:
        extra = "allow"

    def extract_timeframe_updates(self) -> List[tuple]:
        """
        Parses payload into normalized list of tuples: (symbol, tf, timestamp, metrics_dict)
        """
        raw_sym = self.ticker or self.symbol or "UNKNOWN"
        sym = normalize_symbol(raw_sym)
        
        raw_tf = self.interval or self.tf or "1"
        tf = normalize_timeframe(raw_tf)

        # Handle TradingView timestamp (no decimals: integer seconds)
        raw_ts = None
        for key in ["timestamp", "time", "timenow", "bar_time", "bartime", "t"]:
            v = getattr(self, key, None)
            if v is not None:
                raw_ts = v
                break
            if self.framework and isinstance(self.framework, dict) and key in self.framework and self.framework[key] is not None:
                raw_ts = self.framework[key]
                break
            if self.momentum and isinstance(self.momentum, dict) and key in self.momentum and self.momentum[key] is not None:
                raw_ts = self.momentum[key]
                break
            if self.metrics and isinstance(self.metrics, dict) and key in self.metrics and self.metrics[key] is not None:
                raw_ts = self.metrics[key]
                break
            extra = getattr(self, "__extra__", None)
            if extra and isinstance(extra, dict) and key in extra and extra[key] is not None:
                raw_ts = extra[key]
                break

        if raw_ts is not None:
            try:
                raw_f = float(raw_ts)
                if raw_f > 1e11:
                    ts = int(round(raw_f / 1000.0))
                else:
                    ts = int(round(raw_f))
            except Exception:
                ts = int(time.time())
        else:
            ts = int(time.time())

        results = []

        # Case 1: Multi-timeframe batch
        if self.timeframes and isinstance(self.timeframes, dict):
            for timeframe_key, m_dict in self.timeframes.items():
                if isinstance(m_dict, dict):
                    results.append((sym, normalize_timeframe(timeframe_key), ts, m_dict))
            return results

        # Case 2: Structured PRO Framework & Momentum indicator payload
        final_metrics: Dict[str, Any] = {}

        # Add price OHLC and indicator timestamp
        final_metrics["timestamp"] = ts
        if self.open is not None: final_metrics["open"] = self.open
        if self.high is not None: final_metrics["high"] = self.high
        if self.low is not None: final_metrics["low"] = self.low
        if self.price is not None: final_metrics["price"] = self.price
        elif self.close is not None: final_metrics["price"] = self.close

        # Merge framework fields (33 fields)
        if self.framework and isinstance(self.framework, dict):
            final_metrics["_framework"] = self.framework
            for k, v in self.framework.items():
                final_metrics[k] = v

        # Merge momentum fields (24 fields)
        if self.momentum and isinstance(self.momentum, dict):
            final_metrics["_momentum"] = self.momentum
            for k, v in self.momentum.items():
                final_metrics[k] = v

        # Generic metrics dict
        if self.metrics and isinstance(self.metrics, dict):
            for k, v in self.metrics.items():
                final_metrics[k] = v

        # Extra root-level dynamic fields
        ignored_keys = {
            "secret", "symbol", "ticker", "tf", "interval", "time", "timestamp",
            "price", "open", "high", "low", "close", "framework", "momentum", "metrics", "timeframes"
        }
        extra_fields = getattr(self, "__extra__", None)
        if extra_fields:
            for k, v in extra_fields.items():
                if k not in ignored_keys:
                    final_metrics[k] = v

        results.append((sym, tf, ts, final_metrics))
        return results


class AlertRule(BaseModel):
    """Configurable rule for alerting."""
    id: str
    name: str
    field: str
    operator: str = ">"  # '>', '>=', '<', '<=', '==', '!=', 'crosses_above', 'crosses_below', 'in'
    threshold: Any
    symbol: Optional[str] = None       # None means applies to all symbols
    tf: Optional[str] = None           # None means applies to all timeframes
    severity: str = "warning"          # "info", "warning", "danger", "success"
    sound: Optional[str] = "alert.mp3"
    cooldown_sec: int = 120
    enabled: bool = True


class AlertEvent(BaseModel):
    """Generated alert event instance."""
    id: str
    rule_id: str
    rule_name: str
    symbol: str
    tf: str
    timestamp: float
    time_str: str
    field: str
    value: Any
    threshold: Any
    severity: str
    message: str
    read: bool = False
    candle_open: Optional[float] = None


class MetricCell(BaseModel):
    """State of a single (symbol, timeframe) matrix cell."""
    symbol: str
    tf: str
    updated_at: float
    data: Dict[str, Any] = Field(default_factory=dict)
    summary_status: str = "neutral"  # "bullish", "bearish", "neutral"
    alert_count: int = 0
