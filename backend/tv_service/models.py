import time
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field

class TVWebhookPayload(BaseModel):
    """Flexible incoming payload from TradingView alerts."""
    secret: Optional[str] = None
    symbol: str
    tf: Optional[str] = "1m"
    time: Optional[Union[int, float]] = None
    
    # Either dedicated metrics dict...
    metrics: Optional[Dict[str, Any]] = None
    
    # ...or multi-timeframe batch: {"1m": {...}, "5m": {...}}
    timeframes: Optional[Dict[str, Dict[str, Any]]] = None

    class Config:
        extra = "allow"  # Allows arbitrary Pine Script fields at root level

    def extract_timeframe_updates(self) -> List[tuple]:
        """
        Parses payload into normalized list of tuples: (symbol, tf, timestamp, metrics_dict)
        """
        sym = self.symbol.strip().upper()
        ts = float(self.time) if self.time else time.time()
        results = []

        # Case 1: Multi-timeframe payload
        if self.timeframes and isinstance(self.timeframes, dict):
            for timeframe_key, m_dict in self.timeframes.items():
                if isinstance(m_dict, dict):
                    results.append((sym, timeframe_key.strip(), ts, m_dict))
            return results

        # Case 2: Explicit metrics dict
        final_metrics = dict(self.metrics) if self.metrics else {}

        # Case 3: Flat attributes injected at root level
        ignored_keys = {"secret", "symbol", "tf", "time", "metrics", "timeframes"}
        extra_fields = getattr(self, "__extra__", None)
        if extra_fields:
            for k, v in extra_fields.items():
                if k not in ignored_keys:
                    final_metrics[k] = v

        timeframe = (self.tf or "1m").strip()
        results.append((sym, timeframe, ts, final_metrics))
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


class MetricCell(BaseModel):
    """State of a single (symbol, timeframe) matrix cell."""
    symbol: str
    tf: str
    updated_at: float
    data: Dict[str, Any] = Field(default_factory=dict)
    summary_status: str = "neutral"  # "bullish", "bearish", "neutral"
    alert_count: int = 0
