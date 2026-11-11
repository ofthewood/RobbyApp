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
            ),
            AlertRule(
                id="rule_score_high",
                name="Signal d'Achat Fort (Score >= 8)",
                field="score",
                operator=">=",
                threshold=8.0,
                severity="success",
                cooldown_sec=120
            ),
            AlertRule(
                id="rule_score_low",
                name="Signal de Vente Fort (Score <= -8)",
                field="score",
                operator="<=",
                threshold=-8.0,
                severity="danger",
                cooldown_sec=120
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

    def evaluate(self, symbol: str, tf: str, current_metrics: Dict[str, Any], prev_metrics: Dict[str, Any]) -> List[AlertEvent]:
        """
        Evaluates active rules against incoming metrics for a given symbol & timeframe.
        Returns a list of triggered AlertEvents.
        """
        triggered_events: List[AlertEvent] = []
        now = time.time()

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

            # Check if metric field exists
            if rule.field not in current_metrics:
                continue

            curr_val = current_metrics[rule.field]
            prev_val = prev_metrics.get(rule.field) if prev_metrics else None

            # Condition evaluation
            matched, msg = self._check_condition(rule, curr_val, prev_val, symbol, tf)
            if matched:
                self.cooldowns[cd_key] = now
                event = AlertEvent(
                    id=str(uuid.uuid4())[:8],
                    rule_id=rule.id,
                    rule_name=rule.name,
                    symbol=symbol,
                    tf=tf,
                    timestamp=now,
                    time_str=datetime.now().strftime("%H:%M:%S"),
                    field=rule.field,
                    value=curr_val,
                    threshold=rule.threshold,
                    severity=rule.severity,
                    message=msg
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
                if str(curr).lower() != str(th).lower():
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
