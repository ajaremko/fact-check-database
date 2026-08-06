from datetime import datetime
from pathlib import Path
from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files
from state import read_state, write_state
import json
import numpy as np
from internal.extract_cluster_summaries import summarize_clusters

timestamp = datetime.now()

current_state = read_state()
run_id = current_state.get("run_id")
output_base_path = Path(
    f"./tmp/stance_prediction/{run_id}/summary_extraction")
output_base_path.mkdir(parents=True, exist_ok=True)

clusterer = current_state["embedding_clustering"]
if not clusterer:
    raise ValueError("Clusterer state is missing in the current state.")

print(f"Starting summary extraction for run_id: {run_id}")

clusterer_result_path = Path(clusterer["result_path"])

with open(clusterer_result_path, "r", encoding="utf-8") as f:
    clusterer_result = json.load(f)

passage_embedding_pairs = []

for key, cluster_item in clusterer_result.items():
    passages = []
    embeddings = []
    for item in cluster_item:
        with open(item["passage_path"], "r", encoding="utf-8") as f:
            passage_data = f.read()
            passages.append(passage_data)
        embedding_data = np.load(item["embedding_path"])
        embeddings.append(embedding_data)
    passage_embedding_pairs.append((key, passages, np.vstack(embeddings)))

summaries = summarize_clusters(passage_embedding_pairs)
passage_counts = {key: len(passages)
                  for key, passages, _ in passage_embedding_pairs}


for key, summary_text in summaries:

    keywords_path = output_base_path / \
        f"cluster_{key}.txt"

    with open(keywords_path, "w", encoding="utf-8") as f:
        f.write(summary_text)

state_update = {
    "summary_extractor": {
        "run_id": run_id,
        "total_clusters": len(summaries),
        "summaries_path": str(output_base_path),
        "processed_at": timestamp.isoformat(),
        "duration": (datetime.now() - timestamp).total_seconds(),
    }
}

current_state = read_state()
current_state.update(state_update)
write_state(current_state)
