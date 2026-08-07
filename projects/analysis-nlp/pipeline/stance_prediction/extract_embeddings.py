import argparse
import json
from pathlib import Path
from datetime import datetime
import numpy as np

from batch_io import read_json_files
from state import read_state, write_state
from internal.extract_embeddings import extract_embeddings

timestamp = datetime.now()

parser = argparse.ArgumentParser()
parser.add_argument(
    "--root_dir",
    required=True,
    help="Directory of the pipeline run output",
)
args = parser.parse_args()

current_state = read_state(args.root_dir)
output_base_path = Path(f"{args.root_dir}/embedding_extraction")
output_base_path.mkdir(parents=True, exist_ok=True)

segmenter = current_state["passage_segmentation"]
if not segmenter:
    raise ValueError("Segmenter state is missing in the current state.")

passages_meta_path = Path(segmenter["output_directory"])

embeddings_path = Path(f"{output_base_path}/embeddings")
embeddings_path.mkdir(parents=True, exist_ok=True)

embeddings_meta_path = Path(f"{output_base_path}/meta")
embeddings_meta_path.mkdir(parents=True, exist_ok=True)

events = read_json_files(passages_meta_path)

print(f"Loaded {len(events)} passages from {passages_meta_path}")

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
        "total_passages": len(events),
        "processed_at": timestamp.isoformat(),
        "input_directory": str(passages_meta_path),
        "output_directory": str(embeddings_meta_path),
        "duration": (datetime.now() - timestamp).total_seconds()
    }
}

current_state.update(state_update)
write_state(args.root_dir, current_state)
