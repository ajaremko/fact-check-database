import argparse

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

parser = argparse.ArgumentParser()
parser.add_argument(
    "--root_dir",
    required=True,
    help="Directory of the pipeline run output",
)
parser.add_argument(
    "--clustering_strategy",
    required=True,
    help="Clustering strategy to use (e.g., 'agglomerative' or 'hdbscan')",
)
args = parser.parse_args()

current_state = read_state(args.root_dir)
output_base_path = Path(f"{args.root_dir}/embedding_clustering")
output_base_path.mkdir(parents=True, exist_ok=True)

embedding_extraction = current_state["embedding_extraction"]

if not embedding_extraction:
    raise ValueError(
        "Embedding extraction state is missing in the current state.")

embeddings_path = Path(embedding_extraction["output_directory"])

events = read_json_files(embeddings_path)
embeddings = []

for i, doc in enumerate(events):
    file_path, content = doc
    embedding_path = Path(content["embedding_path"])
    embedding = np.load(embedding_path)
    embeddings.append(embedding)


embeddings = np.array(embeddings)
print(f"Loaded {len(embeddings)} embeddings from {embeddings_path}")

if args.clustering_strategy == "agglomerative":
    cluster_labels, reduced_embeddings = agglomerative_clustering(embeddings)
elif args.clustering_strategy == "hdbscan":
    cluster_labels, reduced_embeddings = reduce_and_hdbscan_clustering(
        embeddings)
else:
    raise ValueError(
        f"Unknown clustering strategy: {args.clustering_strategy}")

print(
    f"Clustering completed using {args.clustering_strategy}. Found {len(set(cluster_labels))} clusters.")

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
        "total_passages": len(events),
        "total_clusters": len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0),
        "result_path": str(result_path),
        "processed_at": timestamp.isoformat(),
        "duration": (datetime.now() - timestamp).total_seconds(),
    }
}

current_state.update(state_update)
write_state(args.root_dir, current_state)
