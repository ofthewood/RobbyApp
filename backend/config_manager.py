import os
import json

CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json")

DEFAULT_CONFIG = {
    "symbol": "Ger40",
    "terminal_path_long": "C:/Program Files/ActivTrades  MT5Bull/terminal64.exe",
    "terminal_path_short": "C:/Program Files/ActivTrades  MT5Bear/terminal64.exe",
    "default_lot": 0.25,
    "default_sl_points": 20.0,
    "default_tp_points": 40.0,
    "auto_be_pips": 0,
    "max_spread_pips": 8.0
}

def load_config():
    if not os.path.exists(CONFIG_FILE):
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)
            # Ensure all default keys exist
            updated = False
            for k, v in DEFAULT_CONFIG.items():
                if k not in config:
                    config[k] = v
                    updated = True
            if updated:
                save_config(config)
            return config
    except Exception as e:
        print(f"Error loading config, returning defaults. Error: {e}")
        return DEFAULT_CONFIG

def save_config(config_data):
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=4)
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False
