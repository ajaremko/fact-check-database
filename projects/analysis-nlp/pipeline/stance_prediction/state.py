import json
import os
from datetime import datetime
from pathlib import Path
import secrets


def prepare_output_file_from_env(key="OUTPUT_FILE", default="./tmp/output_file.json") -> Path:
    rel_path = os.getenv(key, default)
    path = Path(rel_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


current_state_path = prepare_output_file_from_env(
    "CURRENT_STATE_PATH", "./tmp/stance_prediction/current.json")

short_id = secrets.token_urlsafe(6)


def empty_state() -> dict:
    return {
        "run_id": secrets.token_urlsafe(6),
    }


def read_state():
    try:
        with open(current_state_path, "r", encoding="utf-8") as file:
            content = file.read()
            state = json.loads(content)
            if not isinstance(state, dict) or not state.get("run_id"):
                raise ValueError(
                    "State file does not contain a valid JSON object.")
            return state
    except FileNotFoundError:
        return empty_state()
    except json.JSONDecodeError:
        return empty_state()
    except ValueError:
        return empty_state()


def write_state(state: dict):
    with open(current_state_path, "w", encoding="utf-8") as file:
        json.dump(state, file, ensure_ascii=False, indent=4)
