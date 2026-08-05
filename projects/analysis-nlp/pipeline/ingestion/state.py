import json
import os
from pathlib import Path


def prepare_output_file_from_env(key="OUTPUT_FILE", default="./tmp/output_file.json") -> Path:
    rel_path = os.getenv(key, default)
    path = Path(rel_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


current_state_path = prepare_output_file_from_env(
    "CURRENT_STATE_PATH", "./tmp/ingestion/current.json")


def read_state():
    try:
        with open(current_state_path, "r", encoding="utf-8") as file:
            content = file.read()
            return json.loads(content)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}


def write_state(state: dict):
    with open(current_state_path, "w", encoding="utf-8") as file:
        json.dump(state, file, ensure_ascii=False, indent=4)
