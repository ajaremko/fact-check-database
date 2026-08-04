import umap
import hdbscan
import os
import numpy as np
import json
from pathlib import Path
import shutil
from datetime import datetime
from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files


def umap_reduce(embeddings):
    # Reduce dimensions with UMAP
    # HDBSCAN works best when dimensions are reduced to 2-10 components
    umap_model = umap.UMAP(
        n_neighbors=5,
        n_components=5,
        metric='cosine',
        random_state=42
    )
    reduced_embeddings = umap_model.fit_transform(embeddings)

    # Cluster with HDBSCAN
    # Use 'cosine' or 'euclidean' based on your data distribution
    # euclidian is good for this case
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=2,
        metric='euclidean',
        cluster_selection_method='eom'
    )

    cluster_labels = clusterer.fit_predict(reduced_embeddings)

    return cluster_labels, reduced_embeddings


embeddings_meta_path = prepare_input_dir_from_env(
    "EMBEDDINGS_META_PATH", "./tmp/meta/embeddings")
clustered_passages_path = prepare_output_dir_from_env(
    "CLUSTERS_PASSAGES_PATH", "./tmp/data/clustered_passages")
clusters_meta_path = prepare_output_dir_from_env(
    "CLUSTERS_META_PATH", "./tmp/meta/clusters")

# Get current time and format it
now = datetime.now()
run_id = now.strftime("%Y-%m-%d_%H:%M:%S")

events = read_json_files(embeddings_meta_path)

embeddings = []

for i, doc in enumerate(events):
    file_path, content = doc
    embedding_path = Path(content["embedding_path"])
    embedding = np.load(embedding_path)
    embeddings.append(embedding)


embeddings = np.array(embeddings)
cluster_labels, reduced_embeddings = umap_reduce(embeddings)

clusters = {}

for label, doc in zip(cluster_labels, events):
    file_path, content = doc
    item = {
        "article_id": content["article_id"],
        "article_path": content["article_path"],
        "passage_index": content["passage_index"],
        "passage_path": content["passage_path"],
    }
    clusters.setdefault(str(label), []).append(item)

cluster_meta = {
    "run_id": run_id,
    "total_passages": len(events),
    "total_clusters": len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0),
    "cluster_labels": cluster_labels.tolist(),
    "clusters": clusters,
    "processed_at": now.isoformat()
}

cluster_meta_path = clusters_meta_path / f"{run_id}.json"

with open(cluster_meta_path, "w", encoding="utf-8") as f:
    json.dump(cluster_meta, f, ensure_ascii=False, indent=4)

for event, label in zip(events, cluster_labels):
    file_path, content = event
    passage_path = Path(content["passage_path"])

    cluster_dir = clustered_passages_path / str(label)
    cluster_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy(passage_path, cluster_dir / passage_path.name)
