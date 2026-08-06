from collections import Counter
import numpy as np
import json
from pathlib import Path
import shutil
from datetime import datetime

from batch_io import read_json_files
from state import read_state, write_state
from internal.build_keyword_inventory import build_keyword_inventory

timestamp = datetime.now()

current_state = read_state()
run_id = current_state.get("run_id")
output_base_path = Path(f"./tmp/stance_prediction/{run_id}/keyword_pairings")
output_base_path.mkdir(parents=True, exist_ok=True)

keyword_pairings_path = output_base_path / "pairings"

keyword_extraction = current_state["keyword_extraction"]
if not keyword_extraction:
    raise ValueError(
        "Keyword extraction state is missing in the current state.")

print(f"Building keyword inventory for run_id: {run_id}")

corpus_counts_path = Path(keyword_extraction["corpus_counts_path"])

with open(corpus_counts_path, "r", encoding="utf-8") as f:
    corpus_counts = json.load(f)

keywords_path = Path(keyword_extraction["output_directory"])

events = read_json_files(keywords_path)
passage_meta_paths_by_cluster = {}
keywords_by_cluster = {}

for i, doc in enumerate(events):
    file_path, content = doc
    cluster_id = content["cluster_id"]
    keywords_by_cluster[cluster_id] = content["keywords"]
    passage_meta_paths_by_cluster[cluster_id] = content["passage_meta_paths"]

inventory = build_keyword_inventory(corpus_counts, top_n=1500)
pairs = []

for cid, kws in keywords_by_cluster.items():
    targets = [w for w in kws if w in inventory]   # top-10 ∩ inventory
    pairs.append({
        "keywords": kws,
        "targets": targets,
        "passage_meta_paths": passage_meta_paths_by_cluster[cid],
        "cluster_id": cid
    })

breadth = Counter(w for kws in keywords_by_cluster.values() for w in kws)
print(Counter(breadth.values()))

for pair in pairs:
    cluster_output_path = keyword_pairings_path / \
        f"cluster_{pair['cluster_id']}.json"
    cluster_output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(cluster_output_path, "w", encoding="utf-8") as f:
        json.dump(pair, f, ensure_ascii=False, indent=4)

inventory_path = output_base_path / "inventory.json"

with open(inventory_path, "w", encoding="utf-8") as f:
    json.dump({"inventory": [w for w in inventory]},
              f, ensure_ascii=False, indent=2)

state_update = {
    "keyword_pairings": {
        "run_id": run_id,
        "processed_at": timestamp.isoformat(),
        "inventory_path": str(inventory_path),
        "output_directory": str(keyword_pairings_path),
        "corpus_counts_path": str(corpus_counts_path),
        "inventory_size": len(inventory),
        "inventory_path": str(inventory_path),
        "duration": (datetime.now() - timestamp).total_seconds()
    }
}

current_state.update(state_update)
write_state(current_state)
