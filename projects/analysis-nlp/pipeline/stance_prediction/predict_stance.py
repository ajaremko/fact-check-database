import argparse
import json
from datetime import datetime
from pathlib import Path

from batch_io import read_json_files
from internal.predict_stance import load_passage_from_meta, predict_stances
from state import read_state, write_state

timestamp = datetime.now()

parser = argparse.ArgumentParser()
parser.add_argument(
    "--root_dir",
    required=True,
    help="Directory of the pipeline run output",
)
args = parser.parse_args()

current_state = read_state(args.root_dir)
output_base_path = Path(f"{args.root_dir}/stance_detection")
output_base_path.mkdir(parents=True, exist_ok=True)

keyword_pairings = current_state["keyword_pairings"]
if not keyword_pairings:
    raise ValueError(
        "Keyword pairings state is missing in the current state.")

pairings_path = Path(keyword_pairings["output_directory"])
events = read_json_files(pairings_path)

total_pairs = 0

for _, content in events:
    cluster_id = content["cluster_id"]
    targets = content["targets"]
    passage_meta_paths = content["passage_meta_paths"]

    if not targets or not passage_meta_paths:
        continue

    passages = []
    article_ids = []
    for meta_path in passage_meta_paths:
        article_id, passage_text = load_passage_from_meta(meta_path)
        passages.append(passage_text)
        article_ids.append(article_id)

    stances = predict_stances(passages, targets)
    for stance in stances:
        stance["article_id"] = article_ids[stance["passage_index"]]
    total_pairs += len(stances)

    output_path = output_base_path / f"cluster_{cluster_id}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "cluster_id": cluster_id,
            "targets": targets,
            "passage_meta_paths": passage_meta_paths,
            "stances": stances,
        }, f, ensure_ascii=False, indent=2)

state_update = {
    "stance_detection": {
        "processed_at": timestamp.isoformat(),
        "pairings_path": str(pairings_path),
        "output_directory": str(output_base_path),
        "total_pairs": total_pairs,
        "duration": (datetime.now() - timestamp).total_seconds(),
    }
}

current_state.update(state_update)
write_state(args.root_dir, current_state)
