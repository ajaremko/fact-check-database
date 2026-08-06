
import json
from pathlib import Path
from datetime import datetime
import numpy as np

from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files
from state import read_state, write_state
from internal.extract_embeddings import extract_embeddings

timestamp = datetime.now()

current_state = read_state()
run_id = current_state.get("run_id")
output_base_path = Path(
    f"./tmp/stance_prediction/{run_id}/embedding_extraction")

segmenter = current_state["segmenter"]
if not segmenter:
    raise ValueError("Segmenter state is missing in the current state.")

print(f"Starting embedding extraction for run_id: {run_id}")

passages_meta_path = Path(segmenter["output_directory"])

embeddings_path = prepare_output_dir_from_env(
    "EMBEDDINGS_PATH", f"{output_base_path}/embeddings")
embeddings_meta_path = prepare_output_dir_from_env(
    "EMBEDDINGS_META_PATH", f"{output_base_path}/meta")


events = read_json_files(passages_meta_path)

passages = []

for i, doc in enumerate(events):
    file_path, content = doc
    with open(content["passage_path"], "r") as file:
        passage_text = file.read()
        passages.append((passage_text, content))

results = extract_embeddings(passages)

for (_passage_text, content), embedding in results:

    embedding_id = f"{content["passage_id"]}"
    embedding_path = embeddings_path / f"{embedding_id}.npy"
    np.save(embedding_path, embedding)

    passage_meta_path = embeddings_meta_path / f"{embedding_id}.json"
    meta_data = content | {
        "embedding_path": str(embedding_path),
        "embedding_length": len(embedding)
    }
    with open(passage_meta_path, "w", encoding="utf-8") as meta_file:
        json.dump(meta_data, meta_file, indent=4)

state_update = {
    "embedding_extraction": {
        "run_id": run_id,
        "total_passages": len(events),
        "processed_at": timestamp.isoformat(),
        "input_directory": str(passages_meta_path),
        "output_directory": str(embeddings_meta_path),
        "duration": (datetime.now() - timestamp).total_seconds()
    }
}

current_state.update(state_update)
write_state(current_state)
