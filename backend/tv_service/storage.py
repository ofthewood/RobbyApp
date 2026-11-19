import time
import sqlite3
import json
import uuid
import logging
from collections import deque
from typing import Dict, Any, List, Optional
from datetime import datetime

from .config import DEFAULT_SYMBOLS, DEFAULT_TIMEFRAMES, DB_PATH, HISTORY_MAX_LEN, RETENTION_DAYS
from .models import AlertEvent

logger = logging.getLogger("tv_service.storage")

class TVStateStore:
    """
    High-performance in-memory state store with SQLite historical persistence.
    Organized as a 2D matrix: store[symbol][timeframe].
    """
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.symbols: List[str] = list(DEFAULT_SYMBOLS)
        self.timeframes: List[str] = list(DEFAULT_TIMEFRAMES)
        
        # In-memory fast matrix: matrix[symbol][tf] = { "updated_at": ts, "data": {...}, "history": deque }
        self.matrix: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._init_matrix()

        # In-memory recent alerts buffer (max 200)
        self.recent_alerts: deque = deque(maxlen=200)

        # Initialize SQLite tables
        self._init_sqlite()

    def _init_matrix(self):
        for sym in self.symbols:
            self.matrix[sym] = {}
            for tf in self.timeframes:
                self.matrix[sym][tf] = {
                    "symbol": sym,
                    "tf": tf,
                    "updated_at": 0.0,
                    "data": {},
                    "history": deque(maxlen=HISTORY_MAX_LEN)
                }

    def _ensure_cell(self, symbol: str, tf: str):
        if symbol not in self.matrix:
            self.matrix[symbol] = {}
            if symbol not in self.symbols:
                self.symbols.append(symbol)
        if tf not in self.matrix[symbol]:
            self.matrix[symbol][tf] = {
                "symbol": symbol,
                "tf": tf,
                "updated_at": 0.0,
                "data": {},
                "history": deque(maxlen=HISTORY_MAX_LEN)
            }
            if tf not in self.timeframes:
                self.timeframes.append(tf)

    def _init_sqlite(self):
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS tv_alerts (
                        id TEXT PRIMARY KEY,
                        rule_id TEXT,
                        rule_name TEXT,
                        symbol TEXT,
                        tf TEXT,
                        timestamp INTEGER,
                        time_str TEXT,
                        field TEXT,
                        value TEXT,
                        threshold TEXT,
                        severity TEXT,
                        message TEXT,
                        read INTEGER DEFAULT 0,
                        candle_open REAL
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS tv_snapshots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        symbol TEXT,
                        tf TEXT,
                        timestamp INTEGER,
                        data_json TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS tv_cells (
                        symbol TEXT,
                        tf TEXT,
                        timestamp INTEGER,
                        data_json TEXT,
                        PRIMARY KEY (symbol, tf)
                    )
                """)
                # Migration for tv_requests if created previously with old timestamp columns
                try:
                    cursor.execute("PRAGMA table_info(tv_requests)")
                    req_cols = [col[1] for col in cursor.fetchall()]
                    if req_cols and "received_at" not in req_cols:
                        cursor.execute("DROP TABLE IF EXISTS tv_requests")
                except Exception as ex_mig:
                    logger.warning(f"tv_requests migration warning: {ex_mig}")

                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS tv_requests (
                        id TEXT PRIMARY KEY,
                        received_at TEXT,
                        candle_time TEXT,
                        client_ip TEXT,
                        symbols TEXT,
                        timeframes TEXT,
                        metrics_count INTEGER,
                        alerts_count INTEGER,
                        sample_price REAL,
                        duration_ms REAL,
                        status TEXT,
                        payload_json TEXT
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_time ON tv_alerts(timestamp DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_sym_tf ON tv_snapshots(symbol, tf, timestamp DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_received ON tv_requests(received_at DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_candle ON tv_requests(candle_time DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_symbols ON tv_requests(symbols)")
                
                # Migration: ensure candle_open column exists if table existed previously
                try:
                    cursor.execute("ALTER TABLE tv_alerts ADD COLUMN candle_open REAL")
                except Exception:
                    pass

                conn.commit()

                # Preload saved matrix cells from DB into memory
                cursor.execute("SELECT symbol, tf, timestamp, data_json FROM tv_cells")
                for c_sym, c_tf, c_ts, c_data_j in cursor.fetchall():
                    try:
                        metrics_dict = json.loads(c_data_j)
                        self._ensure_cell(c_sym, c_tf)
                        self.matrix[c_sym][c_tf]["updated_at"] = c_ts
                        self.matrix[c_sym][c_tf]["data"] = metrics_dict
                        self.matrix[c_sym][c_tf]["history"].append({
                            "timestamp": c_ts,
                            "data": metrics_dict
                        })
                    except Exception as ex_cell:
                        logger.error(f"Error restoring cell {c_sym} {c_tf}: {ex_cell}")
                
                # Load last 100 alerts from DB into memory
                cursor.execute("SELECT id, rule_id, rule_name, symbol, tf, timestamp, time_str, field, value, threshold, severity, message, read, candle_open FROM tv_alerts ORDER BY timestamp DESC LIMIT 100")
                rows = cursor.fetchall()
                for r in reversed(rows):
                    self.recent_alerts.append({
                        "id": r[0],
                        "rule_id": r[1],
                        "rule_name": r[2],
                        "symbol": r[3],
                        "tf": r[4],
                        "timestamp": r[5],
                        "time_str": r[6],
                        "field": r[7],
                        "value": r[8],
                        "threshold": r[9],
                        "severity": r[10],
                        "message": r[11],
                        "read": bool(r[12]),
                        "candle_open": r[13] if len(r) > 13 else None
                    })

                # Initial rolling purge (default 5 days retention)
                try:
                    self.purge_old_data(days=RETENTION_DAYS)
                except Exception as ex_p:
                    logger.warning(f"Initial purge warning: {ex_p}")
        except Exception as e:
            logger.error(f"Error initializing SQLite storage: {e}")

    def update_cell(self, symbol: str, tf: str, timestamp: float, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Updates in-memory cell, adds to rolling history, and returns previous state for delta analysis.
        """
        self._ensure_cell(symbol, tf)
        cell = self.matrix[symbol][tf]
        prev_data = dict(cell["data"])

        # Update data
        cell["updated_at"] = timestamp if timestamp > 0 else time.time()
        cell["data"] = dict(metrics)

        # Append to historical buffer
        cell["history"].append({
            "timestamp": cell["updated_at"],
            "data": dict(metrics)
        })

        # Persist cell snapshot into SQLite
        try:
            ts_int = int(round(float(cell["updated_at"]))) if cell.get("updated_at") is not None else int(time.time())
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO tv_cells (symbol, tf, timestamp, data_json)
                    VALUES (?, ?, ?, ?)
                """, (symbol, tf, ts_int, json.dumps(dict(metrics))))
                conn.commit()
        except Exception as e:
            logger.error(f"Error persisting cell {symbol} {tf}: {e}")

        return prev_data

    def get_matrix_snapshot(self) -> Dict[str, Any]:
        """
        Returns full state snapshot for UI dashboard rendering.
        """
        snapshot = {
            "symbols": self.symbols,
            "timeframes": self.timeframes,
            "timestamp": time.time(),
            "cells": {}
        }
        for sym in self.symbols:
            snapshot["cells"][sym] = {}
            for tf in self.timeframes:
                cell = self.matrix.get(sym, {}).get(tf, {})
                data = cell.get("data", {})
                
                # Compute automatic summary bias/sentiment from common metric names if present
                bias = self._evaluate_cell_bias(data)
                tp_eval = self._evaluate_trend_and_pressure(cell, sym, tf)
                
                snapshot["cells"][sym][tf] = {
                    "symbol": sym,
                    "tf": tf,
                    "updated_at": cell.get("updated_at", 0.0),
                    "data": data,
                    "bias": bias,
                    "trend": tp_eval["trend"],
                    "pressure": tp_eval["pressure"],
                    "recent_signals": tp_eval["recent_signals"],
                    "metric_count": len(data)
                }
        return snapshot

    def _evaluate_trend_and_pressure(self, cell: Dict[str, Any], symbol: str = "", tf: str = "") -> Dict[str, Any]:
        """
        Evaluates PRO Framework trend status, pressure status, and 10-bar alert signals.
        Combines cell data, rolling history, and recorded alerts to ensure signals within
        the last 10 intervals are accurately reported and evaluated for invalidation.
        """
        if not symbol:
            symbol = cell.get("symbol", "")
        if not tf:
            tf = cell.get("tf", "")
        data = cell.get("data", {})
        history = list(cell.get("history", []))

        def to_f(key: str) -> Optional[float]:
            val = data.get(key)
            if val is None or val == "null":
                return None
            try:
                return float(val)
            except:
                return None

        ctx_ma = to_f("Context MA")
        sup_dn = to_f("Context Sup DN")
        sup_up = to_f("Context Sup UP")
        res_dn = to_f("Context Res DN")
        res_up = to_f("Context Res UP")
        price = to_f("price") or to_f("close")
        if price is None and symbol in self.matrix:
            for check_tf in ["1m", "2m", "5m", "15m", "1h", "4h"]:
                c_p = self.matrix[symbol].get(check_tf, {}).get("data", {}).get("price")
                if c_p is not None:
                    try:
                        price = float(c_p)
                        break
                    except:
                        pass

        # 1. TENDANCE
        trend = "range"
        if ctx_ma is not None:
            # Bullish
            if sup_dn is not None and sup_up is not None and sup_dn <= ctx_ma <= sup_up:
                trend = "bull_light"
            elif sup_dn is not None and ctx_ma < sup_dn:
                trend = "bull_dark"
            # Bearish
            elif res_dn is not None and res_up is not None and res_dn <= ctx_ma <= res_up:
                trend = "bear_light"
            elif res_up is not None and ctx_ma > res_up:
                trend = "bear_dark"

        # 2. PRESSION
        pressure = "neutral"
        if price is not None:
            # Acheteuse (côté résistance)
            if res_dn is not None and res_up is not None and res_dn <= price <= res_up:
                pressure = "buy_light"
            elif res_up is not None and price > res_up:
                pressure = "buy_dark"
            # Vendeuse (côté support)
            elif sup_dn is not None and sup_up is not None and sup_dn <= price <= sup_up:
                pressure = "sell_light"
            elif sup_dn is not None and price < sup_dn:
                pressure = "sell_dark"

        # 3. SIGNAUX SUR LES 10 DERNIERS INTERVALLES
        def _get_tf_seconds(tf_name: str) -> int:
            t = str(tf_name).lower().strip()
            if t.endswith("m"):
                try:
                    return max(60, int(t[:-1]) * 60)
                except:
                    return 60
            elif t.endswith("h"):
                try:
                    return max(60, int(t[:-1]) * 3600)
                except:
                    return 3600
            elif t in ["d", "1d"]:
                return 86400
            elif t in ["w", "1w"]:
                return 604800
            try:
                return max(60, int(t) * 60)
            except:
                return 60

        now = time.time()
        tf_sec = _get_tf_seconds(tf)
        cell_open = to_f("open")

        # Map to deduplicate signals: key = (sig_type, bars_ago)
        candidates = {}

        # 3a. Scan cell history buffer
        for h in reversed(history):
            h_data = h.get("data", {})
            h_ts = float(h.get("timestamp", now))
            bars_ago = max(0, int((now - h_ts) // tf_sec)) if tf_sec > 0 else 0
            if bars_ago > 10:
                continue

            h_open = h_data.get("open")
            try:
                h_open = float(h_open) if h_open is not None else None
            except:
                h_open = None

            bull_val = h_data.get("Bull Confirmation Signal") or h_data.get("BULL Signals")
            bear_val = h_data.get("Bear Confirmation Signal") or h_data.get("BEAR Signals")
            bull_tp_val = h_data.get("Bull TP") or h_data.get("Bull TP Signals")
            bear_tp_val = h_data.get("Bear TP") or h_data.get("Bear TP Signals")
            bull_exit_val = h_data.get("Bull EXIT") or h_data.get("Bull EXIT Signals")
            bear_exit_val = h_data.get("Bear EXIT") or h_data.get("Bear EXIT Signals")
            bull_ok_val = h_data.get("BULL OK") or h_data.get("Bull OK")
            bear_ok_val = h_data.get("BEAR OK") or h_data.get("Bear OK")

            is_b = bull_val is not None and str(bull_val).lower() not in ["null", "0", "0.0", "none", "false"]
            is_s = bear_val is not None and str(bear_val).lower() not in ["null", "0", "0.0", "none", "false"]
            is_b_tp = bull_tp_val is not None and str(bull_tp_val).lower() not in ["null", "0", "0.0", "none", "false"]
            is_s_tp = bear_tp_val is not None and str(bear_tp_val).lower() not in ["null", "0", "0.0", "none", "false"]
            is_b_ex = bull_exit_val is not None and str(bull_exit_val).lower() not in ["null", "0", "0.0", "none", "false"]
            is_s_ex = bear_exit_val is not None and str(bear_exit_val).lower() not in ["null", "0", "0.0", "none", "false"]
            is_b_ok = bull_ok_val is not None and str(bull_ok_val).lower() not in ["null", "0", "0.0", "none", "false"]
            is_s_ok = bear_ok_val is not None and str(bear_ok_val).lower() not in ["null", "0", "0.0", "none", "false"]

            c_open = h_open if h_open is not None else cell_open
            if is_b and ("bull", bars_ago) not in candidates:
                candidates[("bull", bars_ago)] = {"type": "bull", "bars_ago": bars_ago, "val": bull_val, "candle_open": c_open, "timestamp": h_ts}
            if is_s and ("bear", bars_ago) not in candidates:
                candidates[("bear", bars_ago)] = {"type": "bear", "bars_ago": bars_ago, "val": bear_val, "candle_open": c_open, "timestamp": h_ts}
            if is_b_tp and ("bull_tp", bars_ago) not in candidates:
                candidates[("bull_tp", bars_ago)] = {"type": "bull_tp", "bars_ago": bars_ago, "val": bull_tp_val, "candle_open": c_open, "timestamp": h_ts}
            if is_s_tp and ("bear_tp", bars_ago) not in candidates:
                candidates[("bear_tp", bars_ago)] = {"type": "bear_tp", "bars_ago": bars_ago, "val": bear_tp_val, "candle_open": c_open, "timestamp": h_ts}
            if is_b_ex and ("bull_exit", bars_ago) not in candidates:
                candidates[("bull_exit", bars_ago)] = {"type": "bull_exit", "bars_ago": bars_ago, "val": bull_exit_val, "candle_open": c_open, "timestamp": h_ts}
            if is_s_ex and ("bear_exit", bars_ago) not in candidates:
                candidates[("bear_exit", bars_ago)] = {"type": "bear_exit", "bars_ago": bars_ago, "val": bear_exit_val, "candle_open": c_open, "timestamp": h_ts}
            if is_b_ok and ("bull_ok", bars_ago) not in candidates:
                candidates[("bull_ok", bars_ago)] = {"type": "bull_ok", "bars_ago": bars_ago, "val": bull_ok_val, "candle_open": c_open, "timestamp": h_ts}
            if is_s_ok and ("bear_ok", bars_ago) not in candidates:
                candidates[("bear_ok", bars_ago)] = {"type": "bear_ok", "bars_ago": bars_ago, "val": bear_ok_val, "candle_open": c_open, "timestamp": h_ts}

        # 3b. Scan recent_alerts (from DB / memory) for symbol & tf
        sym_norm = symbol.upper()
        tf_norm = tf.lower()
        for alert in self.recent_alerts:
            a_sym = alert.get("symbol", "").upper()
            a_tf = alert.get("tf", "").lower()
            if a_sym != sym_norm or a_tf != tf_norm:
                continue

            a_ts = float(alert.get("timestamp", now))
            bars_ago = max(0, int((now - a_ts) // tf_sec)) if tf_sec > 0 else 0
            if bars_ago > 10:
                continue

            rule_id = str(alert.get("rule_id", "")).lower()
            rule_name = str(alert.get("rule_name", "")).lower()
            field_name = str(alert.get("field", "")).lower()
            val = alert.get("value", 1)

            # Entry confirmation signals
            is_b = any(k in rule_name or k in field_name or k in rule_id for k in ["bull confirmation", "bull signals", "rule_pro_bull_conf", "rule_pro_bull_signals"])
            is_s = any(k in rule_name or k in field_name or k in rule_id for k in ["bear confirmation", "bear signals", "rule_pro_bear_conf", "rule_pro_bear_signals"])

            # TP & EXIT signals
            is_b_tp = any(k in rule_name or k in field_name or k in rule_id for k in ["bull tp", "rule_pro_bull_tp"])
            is_s_tp = any(k in rule_name or k in field_name or k in rule_id for k in ["bear tp", "rule_pro_bear_tp"])
            is_b_ex = any(k in rule_name or k in field_name or k in rule_id for k in ["bull exit", "rule_pro_bull_exit"])
            is_s_ex = any(k in rule_name or k in field_name or k in rule_id for k in ["bear exit", "rule_pro_bear_exit"])

            # BULL OK & BEAR OK signals
            is_b_ok = any(k in rule_name or k in field_name or k in rule_id for k in ["bull ok", "rule_pro_bull_ok"])
            is_s_ok = any(k in rule_name or k in field_name or k in rule_id for k in ["bear ok", "rule_pro_bear_ok"])

            a_open = alert.get("candle_open")
            if a_open is None:
                a_open = cell_open

            if is_b and ("bull", bars_ago) not in candidates:
                candidates[("bull", bars_ago)] = {"type": "bull", "bars_ago": bars_ago, "val": val, "candle_open": a_open, "timestamp": a_ts}
            if is_s and ("bear", bars_ago) not in candidates:
                candidates[("bear", bars_ago)] = {"type": "bear", "bars_ago": bars_ago, "val": val, "candle_open": a_open, "timestamp": a_ts}
            if is_b_tp and ("bull_tp", bars_ago) not in candidates:
                candidates[("bull_tp", bars_ago)] = {"type": "bull_tp", "bars_ago": bars_ago, "val": val, "candle_open": a_open, "timestamp": a_ts}
            if is_s_tp and ("bear_tp", bars_ago) not in candidates:
                candidates[("bear_tp", bars_ago)] = {"type": "bear_tp", "bars_ago": bars_ago, "val": val, "candle_open": a_open, "timestamp": a_ts}
            if is_b_ex and ("bull_exit", bars_ago) not in candidates:
                candidates[("bull_exit", bars_ago)] = {"type": "bull_exit", "bars_ago": bars_ago, "val": val, "candle_open": a_open, "timestamp": a_ts}
            if is_s_ex and ("bear_exit", bars_ago) not in candidates:
                candidates[("bear_exit", bars_ago)] = {"type": "bear_exit", "bars_ago": bars_ago, "val": val, "candle_open": a_open, "timestamp": a_ts}
            if is_b_ok and ("bull_ok", bars_ago) not in candidates:
                candidates[("bull_ok", bars_ago)] = {"type": "bull_ok", "bars_ago": bars_ago, "val": val, "candle_open": a_open, "timestamp": a_ts}
            if is_s_ok and ("bear_ok", bars_ago) not in candidates:
                candidates[("bear_ok", bars_ago)] = {"type": "bear_ok", "bars_ago": bars_ago, "val": val, "candle_open": a_open, "timestamp": a_ts}

        # 3c. Evaluate invalidation for entry signals (Bull/Bear confirmation)
        # Bull invalidé si prix actuel < open de la bougie du signal
        # Bear invalidé si prix actuel > open de la bougie du signal
        # Note: Les alertes TP, EXIT, BULL OK et BEAR OK ne sont pas soumises à invalidation.
        recent_signals = []
        for (sig_type, b_ago), sig_obj in sorted(candidates.items(), key=lambda item: item[0][1]):
            sig_open = sig_obj.get("candle_open")
            invalidated = False
            if sig_type == "bull" and price is not None and sig_open is not None:
                if price < sig_open:
                    invalidated = True
            elif sig_type == "bear" and price is not None and sig_open is not None:
                if price > sig_open:
                    invalidated = True

            recent_signals.append({
                "type": sig_type,
                "bars_ago": b_ago,
                "val": sig_obj.get("val", 1),
                "candle_open": sig_open,
                "invalidated": invalidated
            })

        return {
            "trend": trend,
            "pressure": pressure,
            "recent_signals": recent_signals
        }

    def _evaluate_cell_bias(self, data: Dict[str, Any]) -> str:
        """Helper to deduce a high-level color/status ('bullish', 'bearish', 'squeeze', 'neutral')."""
        if not data:
            return "empty"
        
        # Check Squeeze alerts first
        for sq_key in ["PRICE SQUEEZE Alert", "Squeeze Alerts", "Squeeze", "Squeeze Alert Label"]:
            sq_val = data.get(sq_key)
            if sq_val is not None and sq_val != 0 and sq_val != "null" and sq_val != False:
                return "squeeze"

        # Check PRO Framework & PRO Momentum explicit signals
        bull_score = 0
        bear_score = 0

        for bull_key in ["Bull Confirmation Signal", "BULL Signals", "BULL OK", "Bullish Only", "Bull DIV", "Bull TP"]:
            val = data.get(bull_key)
            if val is not None and val != 0 and val != "null" and val != False:
                bull_score += 1

        for bear_key in ["Bear Confirmation Signal", "BEAR Signals", "BEAR OK", "Bearish Only", "Bear DIV", "Bear TP"]:
            val = data.get(bear_key)
            if val is not None and val != 0 and val != "null" and val != False:
                bear_score += 1

        if bull_score > bear_score and bull_score > 0:
            return "bullish"
        if bear_score > bull_score and bear_score > 0:
            return "bearish"

        # Check Oscillator / Momentum numerical polarity
        for key in ["Oscillator", "Momentum", "Trend Signals", "Sinewave"]:
            val = data.get(key)
            if val is not None:
                try:
                    num = float(val)
                    if num > 0.05: return "bullish"
                    elif num < -0.05: return "bearish"
                except:
                    pass

        # Check generic trend/signal fields if provided
        for key in ["trend", "signal", "bias", "status"]:
            if key in data:
                val = str(data[key]).lower()
                if any(x in val for x in ["bull", "buy", "up", "long", "green", "1"]):
                    return "bullish"
                if any(x in val for x in ["bear", "sell", "down", "short", "red", "-1"]):
                    return "bearish"
        
        # Check RSI if present
        if "rsi" in data:
            try:
                rsi_val = float(data["rsi"])
                if rsi_val >= 60:
                    return "bullish"
                if rsi_val <= 40:
                    return "bearish"
            except:
                pass
                
        return "neutral"

    def record_alert(self, alert: AlertEvent):
        """Records an alert event in memory and SQLite."""
        alert_dict = alert.dict()
        if alert_dict.get("timestamp") is not None:
            alert_dict["timestamp"] = int(round(float(alert_dict["timestamp"])))
        self.recent_alerts.appendleft(alert_dict)
        try:
            ts_int = int(round(float(alert.timestamp))) if alert.timestamp is not None else int(time.time())
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO tv_alerts (
                        id, rule_id, rule_name, symbol, tf, timestamp, time_str, field, value, threshold, severity, message, read, candle_open
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert.id, alert.rule_id, alert.rule_name, alert.symbol, alert.tf,
                    ts_int, alert.time_str, alert.field, str(alert.value),
                    str(alert.threshold), alert.severity, alert.message, 1 if alert.read else 0,
                    alert.candle_open
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error persisting alert {alert.id}: {e}")

    def get_recent_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        return list(self.recent_alerts)[:limit]

    def clear_alerts(self):
        self.recent_alerts.clear()
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("DELETE FROM tv_alerts")
                conn.commit()
        except Exception as e:
            logger.error(f"Error clearing alerts: {e}")

    def query_stored_alerts(
        self,
        symbol: Optional[str] = None,
        tf: Optional[str] = None,
        rule_name: Optional[str] = None,
        search: Optional[str] = None,
        alert_id: Optional[str] = None,
        order_by: str = "timestamp",
        order_dir: str = "DESC",
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Queries stored historical alerts from SQLite tv_alerts with filtering, sorting, and pagination."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                conditions = []
                params = []

                if alert_id:
                    conditions.append("id = ?")
                    params.append(alert_id)

                if symbol:
                    s_norm = symbol.upper()
                    if s_norm == "USA500":
                        conditions.append("(symbol = 'USA500' OR symbol = 'SPX500' OR symbol = 'US500')")
                    else:
                        conditions.append("symbol = ?")
                        params.append(s_norm)

                if tf:
                    conditions.append("LOWER(tf) = LOWER(?)")
                    params.append(tf)

                if rule_name:
                    conditions.append("(rule_name LIKE ? OR field LIKE ?)")
                    params.extend([f"%{rule_name}%", f"%{rule_name}%"])

                if search:
                    conditions.append("(id LIKE ? OR message LIKE ? OR rule_name LIKE ? OR field LIKE ? OR symbol LIKE ?)")
                    params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])

                where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

                # Count query
                cursor.execute(f"SELECT COUNT(*) FROM tv_alerts {where_clause}", params)
                total_count = cursor.fetchone()[0]

                # Sorting column whitelist
                allowed_sort_columns = {
                    "timestamp": "timestamp",
                    "date": "timestamp",
                    "time": "timestamp",
                    "symbol": "symbol",
                    "tf": "tf",
                    "rule_name": "rule_name",
                    "rule": "rule_name",
                    "value": "CAST(value AS REAL)",
                    "bars_ago": "CAST(value AS REAL)",
                    "price": "COALESCE(candle_open, CAST(value AS REAL))",
                    "candle_open": "candle_open",
                    "id": "id"
                }
                sort_col = allowed_sort_columns.get(str(order_by).lower().strip(), "timestamp")
                sort_direction = "ASC" if str(order_dir).upper().strip() == "ASC" else "DESC"

                # Data query
                cursor.execute(
                    f"SELECT id, rule_id, rule_name, symbol, tf, timestamp, time_str, field, value, threshold, severity, message, read, candle_open "
                    f"FROM tv_alerts {where_clause} ORDER BY {sort_col} {sort_direction} LIMIT ? OFFSET ?",
                    params + [limit, offset]
                )
                alerts_list = []
                for r in cursor.fetchall():
                    item = dict(r)
                    ts = item.get("timestamp")
                    dt_str = item.get("time_str") or "--"
                    if ts is not None:
                        try:
                            t_val = float(ts)
                            if t_val > 1e11:
                                t_val = t_val / 1000.0
                            t_int = int(round(t_val))
                            dt_str = datetime.fromtimestamp(t_int).strftime("%Y-%m-%d %H:%M:%S")
                            item["timestamp"] = t_int
                        except Exception:
                            pass
                    item["datetime_str"] = dt_str
                    item["time_str"] = dt_str
                    item["created_at"] = dt_str
                    alerts_list.append(item)

                return {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "order_by": order_by,
                    "order_dir": sort_direction.lower(),
                    "alerts": alerts_list
                }
        except Exception as e:
            logger.error(f"Error querying stored alerts: {e}")
            return {"total": 0, "limit": limit, "offset": offset, "alerts": []}

    def get_stored_alert(self, alert_id: str) -> Optional[Dict[str, Any]]:
        """Returns detail for a specific alert by id."""
        res = self.query_stored_alerts(alert_id=alert_id, limit=1)
        alerts = res.get("alerts", [])
        return alerts[0] if alerts else None

    def query_stored_cells(self) -> List[Dict[str, Any]]:
        """Queries all stored cell snapshots from SQLite tv_cells."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT symbol, tf, timestamp, data_json FROM tv_cells ORDER BY symbol, tf")
                cells = []
                for r in cursor.fetchall():
                    try:
                        d = json.loads(r["data_json"])
                    except Exception:
                        d = {}
                    ts = r["timestamp"]
                    ts_val = int(round(float(ts))) if ts is not None else None
                    time_str = datetime.fromtimestamp(ts_val).strftime("%Y-%m-%d %H:%M:%S") if ts_val else "--"
                    cells.append({
                        "symbol": r["symbol"],
                        "tf": r["tf"],
                        "timestamp": ts_val,
                        "time_str": time_str,
                        "updated_at": time_str,
                        "metrics_count": len(d),
                        "price": d.get("price") or d.get("close"),
                        "open": d.get("open"),
                        "high": d.get("high"),
                        "low": d.get("low")
                    })
                return cells
        except Exception as e:
            logger.error(f"Error querying stored cells: {e}")
            return []

    def get_stored_cell_detail(self, symbol: str, tf: str) -> Optional[Dict[str, Any]]:
        """Returns full json data for a stored cell."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT timestamp, data_json FROM tv_cells WHERE symbol = ? AND tf = ?", (symbol.upper(), tf))
                row = cursor.fetchone()
                if not row:
                    if symbol.upper() == "USA500":
                        cursor.execute("SELECT timestamp, data_json FROM tv_cells WHERE symbol IN ('USA500', 'SPX500', 'US500') AND tf = ?", (tf,))
                        row = cursor.fetchone()
                if row:
                    return {
                        "symbol": symbol.upper(),
                        "tf": tf,
                        "timestamp": row[0],
                        "data": json.loads(row[1]) if row[1] else {}
                    }
                return None
        except Exception as e:
            logger.error(f"Error querying cell detail {symbol} {tf}: {e}")
            return None

    def record_request(self, req: Dict[str, Any]):
        """Persists incoming webhook request entry into SQLite tv_requests table."""
        try:
            received_at = req.get("received_at") or req.get("datetime_str") or req.get("time_str") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            candle_time = req.get("candle_time") or "--"
            syms = req.get("symbols") or []
            symbols_str = ",".join(syms) if isinstance(syms, (list, tuple)) else str(syms)
            tfs = req.get("timeframes") or []
            tfs_str = ",".join(tfs) if isinstance(tfs, (list, tuple)) else str(tfs)

            raw_payload = req.get("raw_preview") or {}
            payload_str = json.dumps(raw_payload) if isinstance(raw_payload, dict) else str(raw_payload)

            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO tv_requests (
                        id, received_at, candle_time, client_ip, symbols, timeframes,
                        metrics_count, alerts_count, sample_price, duration_ms, status, payload_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    req.get("id") or str(uuid.uuid4())[:8],
                    received_at,
                    candle_time,
                    req.get("client_ip") or "--",
                    symbols_str,
                    tfs_str,
                    int(req.get("metrics_count") or 0),
                    int(req.get("alerts_count") or 0),
                    float(req["sample_price"]) if req.get("sample_price") is not None else None,
                    float(req.get("duration_ms") or 0.0),
                    req.get("status") or "200 OK",
                    payload_str
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Error persisting webhook request {req.get('id')}: {e}")

    def get_total_requests_count(self) -> int:
        """Returns total count of stored webhook requests."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM tv_requests")
                return cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"Error getting total requests count: {e}")
            return 0

    def query_stored_requests(
        self,
        symbol: Optional[str] = None,
        tf: Optional[str] = None,
        alerts_only: bool = False,
        search: Optional[str] = None,
        req_id: Optional[str] = None,
        order_by: str = "received_at",
        order_dir: str = "DESC",
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Queries stored historical webhook requests from SQLite tv_requests."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()

                conditions = []
                params = []

                if req_id:
                    conditions.append("id = ?")
                    params.append(req_id)

                if symbol:
                    s_norm = symbol.upper()
                    if s_norm == "USA500":
                        conditions.append("(symbols LIKE '%USA500%' OR symbols LIKE '%SPX500%' OR symbols LIKE '%US500%')")
                    else:
                        conditions.append("symbols LIKE ?")
                        params.append(f"%{s_norm}%")

                if tf:
                    conditions.append("timeframes LIKE ?")
                    params.append(f"%{tf}%")

                if alerts_only:
                    conditions.append("alerts_count > 0")

                if search:
                    conditions.append("(id LIKE ? OR symbols LIKE ? OR timeframes LIKE ? OR client_ip LIKE ? OR payload_json LIKE ? OR received_at LIKE ? OR candle_time LIKE ?)")
                    params.extend([f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"])

                where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

                cursor.execute(f"SELECT COUNT(*) FROM tv_requests {where_clause}", params)
                total_count = cursor.fetchone()[0]

                allowed_sort = {
                    "received_at": "received_at",
                    "time": "received_at",
                    "date": "received_at",
                    "timestamp": "received_at",
                    "candle_time": "candle_time",
                    "candle": "candle_time",
                    "symbol": "symbols",
                    "symbols": "symbols",
                    "tf": "timeframes",
                    "timeframe": "timeframes",
                    "alerts": "alerts_count",
                    "alerts_count": "alerts_count",
                    "price": "sample_price",
                    "sample_price": "sample_price",
                    "metrics": "metrics_count",
                    "metrics_count": "metrics_count",
                    "duration": "duration_ms",
                    "duration_ms": "duration_ms",
                    "ip": "client_ip",
                    "client_ip": "client_ip",
                    "id": "id"
                }
                sort_col = allowed_sort.get(str(order_by).lower().strip(), "received_at")
                sort_direction = "ASC" if str(order_dir).upper().strip() == "ASC" else "DESC"

                cursor.execute(
                    f"SELECT id, received_at, candle_time, client_ip, symbols, timeframes, metrics_count, alerts_count, sample_price, duration_ms, status, payload_json "
                    f"FROM tv_requests {where_clause} ORDER BY {sort_col} {sort_direction} LIMIT ? OFFSET ?",
                    params + [limit, offset]
                )

                reqs_list = []
                for r in cursor.fetchall():
                    item = dict(r)
                    raw_p = item.get("payload_json")
                    try:
                        item["raw_preview"] = json.loads(raw_p) if raw_p else {}
                    except Exception:
                        item["raw_preview"] = {}
                    item["time_str"] = item["received_at"]
                    item["time"] = item["received_at"]
                    syms_raw = item.get("symbols") or ""
                    item["symbols"] = [s.strip() for s in syms_raw.split(",") if s.strip()]
                    tfs_raw = item.get("timeframes") or ""
                    item["timeframes"] = [t.strip() for t in tfs_raw.split(",") if t.strip()]
                    reqs_list.append(item)

                return {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "order_by": order_by,
                    "order_dir": sort_direction.lower(),
                    "requests": reqs_list
                }
        except Exception as e:
            logger.error(f"Error querying stored requests: {e}")
            return {"total": 0, "limit": limit, "offset": offset, "requests": []}

    def get_stored_request(self, req_id: str) -> Optional[Dict[str, Any]]:
        """Returns details of a specific stored webhook request."""
        res = self.query_stored_requests(req_id=req_id, limit=1)
        reqs = res.get("requests", [])
        return reqs[0] if reqs else None

    def get_recent_stored_requests(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Returns the most recent webhook requests for in-memory display."""
        res = self.query_stored_requests(limit=limit, order_by="received_at", order_dir="DESC")
        return res.get("requests", [])

    def clear_stored_requests(self):
        """Clears tv_requests table."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("DELETE FROM tv_requests")
                conn.commit()
        except Exception as e:
            logger.error(f"Error clearing stored requests: {e}")

    def purge_old_data(self, days: int = RETENTION_DAYS) -> Dict[str, Any]:
        """
        Purges historical alerts, requests, and snapshots older than `days` days (rolling retention).
        """
        now = time.time()
        cutoff_ts = int(now - (days * 86400))
        cutoff_dt_str = datetime.fromtimestamp(cutoff_ts).strftime("%Y-%m-%d %H:%M:%S")

        purged_alerts = 0
        purged_requests = 0
        purged_snapshots = 0

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # 1. Purge tv_alerts
                cursor.execute("SELECT COUNT(*) FROM tv_alerts WHERE timestamp < ?", (cutoff_ts,))
                purged_alerts = cursor.fetchone()[0]
                if purged_alerts > 0:
                    cursor.execute("DELETE FROM tv_alerts WHERE timestamp < ?", (cutoff_ts,))

                # 2. Purge tv_requests
                cursor.execute("SELECT COUNT(*) FROM tv_requests WHERE received_at < ?", (cutoff_dt_str,))
                purged_requests = cursor.fetchone()[0]
                if purged_requests > 0:
                    cursor.execute("DELETE FROM tv_requests WHERE received_at < ?", (cutoff_dt_str,))

                # 3. Purge tv_snapshots
                cursor.execute("SELECT COUNT(*) FROM tv_snapshots WHERE timestamp < ?", (cutoff_ts,))
                purged_snapshots = cursor.fetchone()[0]
                if purged_snapshots > 0:
                    cursor.execute("DELETE FROM tv_snapshots WHERE timestamp < ?", (cutoff_ts,))

                conn.commit()

            # Clean in-memory recent_alerts
            self.recent_alerts = deque([a for a in self.recent_alerts if float(a.get("timestamp", 0)) >= cutoff_ts], maxlen=200)

            logger.info(f"🧹 Purge {days}J glissant exécutée: {purged_alerts} alertes, {purged_requests} requêtes, {purged_snapshots} snapshots supprimés (avant {cutoff_dt_str}).")
            return {
                "status": "ok",
                "days": days,
                "cutoff_timestamp": cutoff_ts,
                "cutoff_datetime": cutoff_dt_str,
                "purged_alerts": purged_alerts,
                "purged_requests": purged_requests,
                "purged_snapshots": purged_snapshots
            }
        except Exception as e:
            logger.error(f"Error purging old data: {e}")
            return {"status": "error", "error": str(e)}
