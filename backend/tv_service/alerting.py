import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from .models import AlertRule, AlertEvent
from .storage import TVStateStore

logger = logging.getLogger("tv_service.alerting")

class AlertEngine:
    def __init__(self, store: TVStateStore):
        self.store = store
        self.rules: Dict[str, AlertRule] = {}
        # Cooldown map: key = f"{rule_id}:{symbol}:{tf}" -> last_triggered_timestamp
        self.cooldowns: Dict[str, float] = {}

        # Load default starter rules
        self._init_default_rules()

    def _init_default_rules(self):
        default_rules = [
            AlertRule(
                id="rule_pro_bull_conf",
                name="Bull Confirmation Signal",
                field="Bull Confirmation Signal",
                operator="!=",
                threshold="null",
                severity="success",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_pro_bear_conf",
                name="Bear Confirmation Signal",
                field="Bear Confirmation Signal",
                operator="!=",
                threshold="null",
                severity="danger",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_pro_bull_signals",
                name="PRO Momentum BULL Signal",
                field="BULL Signals",
                operator="!=",
                threshold="null",
                severity="success",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_pro_bear_signals",
                name="PRO Momentum BEAR Signal",
                field="BEAR Signals",
                operator="!=",
                threshold="null",
                severity="danger",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_pro_squeeze",
                name="Price Squeeze Alert",
                field="PRICE SQUEEZE Alert",
                operator="!=",
                threshold="null",
                severity="warning",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_pro_bull_tp",
                name="Bull TP Signals",
                field="Bull TP Signals",
                operator="!=",
                threshold="null",
                severity="success",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_pro_bear_tp",
                name="Bear TP Signals",
                field="Bear TP Signals",
                operator="!=",
                threshold="null",
                severity="danger",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_pro_bull_exit",
                name="Bull EXIT Signals",
                field="Bull EXIT Signals",
                operator="!=",
                threshold="null",
                severity="warning",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_pro_bear_exit",
                name="Bear EXIT Signals",
                field="Bear EXIT Signals",
                operator="!=",
                threshold="null",
                severity="warning",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_rsi_overbought",
                name="RSI Suracheté (>= 70)",
                field="rsi",
                operator=">=",
                threshold=70.0,
                severity="warning",
                cooldown_sec=180
            ),
            AlertRule(
                id="rule_rsi_oversold",
                name="RSI Survendu (<= 30)",
                field="rsi",
                operator="<=",
                threshold=30.0,
                severity="warning",
                cooldown_sec=180
            )
        ]
        for r in default_rules:
            self.rules[r.id] = r

    def add_rule(self, rule: AlertRule):
        self.rules[rule.id] = rule

    def remove_rule(self, rule_id: str):
        if rule_id in self.rules:
            del self.rules[rule_id]

    def get_rules(self) -> List[AlertRule]:
        return list(self.rules.values())

    def evaluate(
        self,
        symbol: str,
        tf: str,
        current_metrics: Dict[str, Any],
        prev_metrics: Dict[str, Any],
        timestamp: Optional[float] = None
    ) -> List[AlertEvent]:
        """
        Evaluates active rules against incoming metrics for a given symbol & timeframe.
        Returns a list of triggered AlertEvents with timestamp deduced from the indicator.
        """
        triggered_events: List[AlertEvent] = []
        now = int(time.time())

        # Derive exact event timestamp and formatted Date & Time from indicator payload (no decimals: integer)
        indicator_ts = timestamp or current_metrics.get("timestamp")
        if indicator_ts is not None:
            try:
                raw_f = float(indicator_ts)
                if raw_f > 1e11:
                    indicator_ts = int(round(raw_f / 1000.0))
                else:
                    indicator_ts = int(round(raw_f))
            except Exception:
                indicator_ts = now
        else:
            indicator_ts = now

        indicator_dt = datetime.fromtimestamp(indicator_ts)
        indicator_time_str = indicator_dt.strftime("%Y-%m-%d %H:%M:%S")

        for rule in self.rules.values():
            if not rule.enabled:
                continue

            # Scope check
            if rule.symbol and rule.symbol.upper() != symbol.upper():
                continue
            if rule.tf and rule.tf.lower() != tf.lower():
                continue

            # Cooldown check
            cd_key = f"{rule.id}:{symbol}:{tf}"
            last_fired = self.cooldowns.get(cd_key, 0.0)
            if (now - last_fired) < rule.cooldown_sec:
                continue

            # Check if metric field exists (with alias lookup)
            curr_val = current_metrics.get(rule.field)
            matched_field = rule.field
            if curr_val is None:
                aliases = {
                    "Bull TP Signals": ["Bull TP", "Bull TP Signals", "Bull_TP", "Bull TP Signal"],
                    "Bear TP Signals": ["Bear TP", "Bear TP Signals", "Bear_TP", "Bear TP Signal"],
                    "Bull EXIT Signals": ["Bull EXIT", "Bull EXIT Signals", "Bull_EXIT", "Bull EXIT Signal"],
                    "Bear EXIT Signals": ["Bear EXIT", "Bear EXIT Signals", "Bear_EXIT", "Bear EXIT Signal"],
                    "Bull Confirmation Signal": ["Bull Confirmation Signal", "Bull_Confirmation_Signal"],
                    "Bear Confirmation Signal": ["Bear Confirmation Signal", "Bear_Confirmation_Signal"],
                    "BULL Signals": ["BULL Signals", "BULL_Signals", "Bull Signals"],
                    "BEAR Signals": ["BEAR Signals", "BEAR_Signals", "Bear Signals"],
                    "PRICE SQUEEZE Alert": ["PRICE SQUEEZE Alert", "Squeeze Alerts", "Squeeze"]
                }
                for alias in aliases.get(rule.field, []):
                    if alias in current_metrics and current_metrics[alias] is not None:
                        curr_val = current_metrics[alias]
                        matched_field = alias
                        break

            if curr_val is None:
                continue

            prev_val = prev_metrics.get(matched_field) if prev_metrics else None

            # Condition evaluation
            matched, msg = self._check_condition(rule, curr_val, prev_val, symbol, tf)
            if matched:
                self.cooldowns[cd_key] = now
                open_val = current_metrics.get("open")
                try:
                    open_val = float(open_val) if open_val is not None else None
                except Exception:
                    open_val = None

                event = AlertEvent(
                    id=str(uuid.uuid4())[:8],
                    rule_id=rule.id,
                    rule_name=rule.name,
                    symbol=symbol,
                    tf=tf,
                    timestamp=indicator_ts,
                    time_str=indicator_time_str,
                    field=rule.field,
                    value=curr_val,
                    threshold=rule.threshold,
                    severity=rule.severity,
                    message=msg,
                    candle_open=open_val
                )
                self.store.record_alert(event)
                triggered_events.append(event)
                logger.info(f"🚨 ALERT TRIGGERED: [{symbol} {tf}] {msg}")

        return triggered_events

    def _check_condition(self, rule: AlertRule, curr: Any, prev: Any, symbol: str, tf: str) -> tuple:
        op = rule.operator.lower().strip()
        th = rule.threshold

        try:
            # Numeric comparisons
            if op in [">", ">=", "<", "<="]:
                curr_f = float(curr)
                th_f = float(th)
                if op == ">" and curr_f > th_f:
                    return True, f"{symbol} ({tf}) : {rule.field} = {curr_f} (> {th_f})"
                if op == ">=" and curr_f >= th_f:
                    return True, f"{symbol} ({tf}) : {rule.field} = {curr_f} (>= {th_f})"
                if op == "<" and curr_f < th_f:
                    return True, f"{symbol} ({tf}) : {rule.field} = {curr_f} (< {th_f})"
                if op == "<=" and curr_f <= th_f:
                    return True, f"{symbol} ({tf}) : {rule.field} = {curr_f} (<= {th_f})"

            # Equality
            elif op == "==":
                if str(curr).lower() == str(th).lower():
                    return True, f"{symbol} ({tf}) : {rule.field} est passé à {curr}"
            elif op == "!=":
                if str(th).lower() == "null":
                    if curr is not None and str(curr).lower() not in ["null", "none", "0", "0.0", "nan", "false"]:
                        return True, f"{symbol} ({tf}) : Signal détecté sur {rule.field} (valeur: {curr})"
                elif str(curr).lower() != str(th).lower():
                    return True, f"{symbol} ({tf}) : {rule.field} est différent de {th}"

            # Crossings (requires prev value)
            elif op in ["crosses_above", "croisement_haut"] and prev is not None:
                curr_f, prev_f, th_f = float(curr), float(prev), float(th)
                if prev_f <= th_f and curr_f > th_f:
                    return True, f"{symbol} ({tf}) : {rule.field} a croisé à la hausse {th_f} (actuel: {curr_f})"

            elif op in ["crosses_below", "croisement_bas"] and prev is not None:
                curr_f, prev_f, th_f = float(curr), float(prev), float(th)
                if prev_f >= th_f and curr_f < th_f:
                    return True, f"{symbol} ({tf}) : {rule.field} a croisé à la baisse {th_f} (actuel: {curr_f})"

        except Exception as e:
            logger.debug(f"Condition comparison error: {e}")

        return False, ""
