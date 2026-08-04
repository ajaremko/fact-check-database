import hashlib
import os
import json
from pathlib import Path


def prepare_output_dir_from_env(key="OUTPUT_DIR", default="./tmp/output") -> Path:
    rel_path = os.getenv(key, default)
    path = Path(rel_path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def prepare_input_dir_from_env(key="INPUT_DIR", default="./tmp/input") -> Path:
    rel_path = os.getenv(key, default)
    path = Path(rel_path)
    return path


def read_text_files(directory_path) -> list[tuple[Path, str]]:
    files = []
    for file_path in directory_path.iterdir():
        if file_path.is_file():
            print(f"Reading: {file_path.stem}")
            with open(file_path, "r", encoding="utf-8") as file:
                content = file.read()
                files.append((file_path, content))
    return files


def read_json_files(directory_path) -> list[tuple[Path, dict]]:
    files = []
    for file_path in directory_path.iterdir():
        if file_path.is_file():
            print(f"Reading: {file_path.stem}")
            with open(file_path, "r", encoding="utf-8") as file:
                content = json.load(file)
                files.append((file_path, content))
    return files


def read_subdirectories(directory_path) -> list[Path]:
    subdirs = []
    for subdir in directory_path.iterdir():
        if subdir.is_dir():
            print(f"Found subdirectory: {subdir.stem}")
            subdirs.append(subdir)
    return subdirs


def hash_sha256(input_string: str) -> str:
    encoded_bytes = input_string.encode('utf-8')
    return hashlib.sha256(encoded_bytes).hexdigest()
