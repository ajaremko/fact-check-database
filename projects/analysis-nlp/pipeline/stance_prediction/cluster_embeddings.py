import numpy as np
import json
from pathlib import Path
import shutil
from datetime import datetime

from batch_io import read_json_files
from state import read_state, write_state
from internal.cluster_embeddings_agglomerative import agglomerative_clustering
from internal.cluster_embeddings_hdbscan import reduce_and_hdbscan_clustering

timestamp = datetime.now()

current_state = read_state()
run_id = current_state.get("run_id")
output_base_path = Path(
    f"./tmp/stance_prediction/{run_id}/embedding_clustering")
output_base_path.mkdir(parents=True, exist_ok=True)

keyword_extraction = current_state["embedding_extraction"]
if not keyword_extraction:
    raise ValueError(
        "Embedding extraction state is missing in the current state.")

print(f"Starting embedding clustering for run_id: {run_id}")

keywords_path = Path(keyword_extraction["output_directory"])

events = read_json_files(keywords_path)
embeddings = []

for i, doc in enumerate(events):
    file_path, content = doc
    embedding_path = Path(content["embedding_path"])
    embedding = np.load(embedding_path)
    embeddings.append(embedding)


embeddings = np.array(embeddings)
cluster_labels, reduced_embeddings = agglomerative_clustering(embeddings)
# cluster_labels, reduced_embeddings = reduce_and_hdbscan_clustering(embeddings)

# Write clusters to a JSON file
clusters = {}

for label, doc in zip(cluster_labels, events):
    file_path, content = doc
    item = {
        "article_id": content["article_id"],
        "article_path": content["article_path"],
        "passage_index": content["passage_index"],
        "passage_path": content["passage_path"],
        "passage_meta_path": str(file_path),
        "embedding_path": content["embedding_path"],
    }
    clusters.setdefault(str(label), []).append(item)

result_path = output_base_path / "results.json"

with open(result_path, "w", encoding="utf-8") as f:
    json.dump(clusters, f, ensure_ascii=False, indent=4)

# Ensure that directories for each cluster label exist
for label in set(cluster_labels):
    passage_dest = Path(
        f"{output_base_path}/passages/{label}")
    passage_dest.mkdir(parents=True, exist_ok=True)

# Copy clustered passages to new directories organized by cluster label
for event, label in zip(events, cluster_labels):
    file_path, content = event
    passage_id = content["passage_id"]
    passage_path = Path(content["passage_path"])

    passage_dest = Path(
        f"{output_base_path}/passages/{label}/{passage_id}")

    shutil.copy(passage_path, passage_dest)

state_update = {
    "embedding_clustering": {
        "run_id": run_id,
        "total_passages": len(events),
        "total_clusters": len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0),
        "result_path": str(result_path),
        "processed_at": timestamp.isoformat(),
        "duration": (datetime.now() - timestamp).total_seconds(),
    }
}

current_state = read_state()
current_state.update(state_update)
write_state(current_state)
