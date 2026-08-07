import json
import os
from datetime import datetime
from pathlib import Path


def prepare_output_file_from_env(key="OUTPUT_FILE", default="./tmp/output_file.json") -> Path:
    rel_path = os.getenv(key, default)
    path = Path(rel_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def read_state(root_path: str):
    current_state_path = Path(root_path) / "current.json"
    with open(current_state_path, "r", encoding="utf-8") as file:
        content = file.read()
        state = json.loads(content)
        if not isinstance(state, dict) or not state.get("run_id"):
            raise ValueError(
                "State file does not contain a valid JSON object.")
        return state


def write_state(root_path: str, state: dict):
    current_state_path = Path(root_path) / "current.json"
    with open(current_state_path, "w", encoding="utf-8") as file:
        json.dump(state, file, ensure_ascii=False, indent=4)
