import time
import sqlite3
import json
import logging
from collections import deque
from typing import Dict, Any, List, Optional
from datetime import datetime

from .config import DEFAULT_SYMBOLS, DEFAULT_TIMEFRAMES, DB_PATH, HISTORY_MAX_LEN
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
                        timestamp REAL,
                        time_str TEXT,
                        field TEXT,
                        value TEXT,
                        threshold TEXT,
                        severity TEXT,
                        message TEXT,
                        read INTEGER DEFAULT 0
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS tv_snapshots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        symbol TEXT,
                        tf TEXT,
                        timestamp REAL,
                        data_json TEXT
                    )
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_time ON tv_alerts(timestamp DESC)")
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_snapshots_sym_tf ON tv_snapshots(symbol, tf, timestamp DESC)")
                conn.commit()
                
                # Load last 50 alerts from DB into memory
                cursor.execute("SELECT id, rule_id, rule_name, symbol, tf, timestamp, time_str, field, value, threshold, severity, message, read FROM tv_alerts ORDER BY timestamp DESC LIMIT 50")
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
                        "read": bool(r[12])
                    })
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
                
                snapshot["cells"][sym][tf] = {
                    "symbol": sym,
                    "tf": tf,
                    "updated_at": cell.get("updated_at", 0.0),
                    "data": data,
                    "bias": bias,
                    "metric_count": len(data)
                }
        return snapshot

    def _evaluate_cell_bias(self, data: Dict[str, Any]) -> str:
        """Helper to deduce a high-level color/status ('bullish', 'bearish', 'neutral')."""
        if not data:
            return "empty"
        
        # Check explicit trend/signal fields if provided by Pine script
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
        self.recent_alerts.appendleft(alert_dict)
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO tv_alerts (
                        id, rule_id, rule_name, symbol, tf, timestamp, time_str, field, value, threshold, severity, message, read
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert.id, alert.rule_id, alert.rule_name, alert.symbol, alert.tf,
                    alert.timestamp, alert.time_str, alert.field, str(alert.value),
                    str(alert.threshold), alert.severity, alert.message, 1 if alert.read else 0
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
