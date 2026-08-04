import umap
import hdbscan
import os
import json
from pathlib import Path
import shutil
from datetime import datetime

embeddings_meta_rel_path = os.getenv(
    "EMBEDDINGS_META_PATH", "./tmp/meta/embeddings")
embeddings_meta_path = Path(embeddings_meta_rel_path)

clusters_rel_path = os.getenv(
    "CLUSTERS_PASSAGES_PATH", "./tmp/clusters")
clusters_path = Path(clusters_rel_path)
clusters_path.mkdir(parents=True, exist_ok=True)


clusters_meta_rel_path = os.getenv(
    "CLUSTERS_META_PATH", "./tmp/meta/clusters")
clusters_meta_path = Path(clusters_meta_rel_path)
clusters_meta_path.mkdir(parents=True, exist_ok=True)


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


embeddings = []
documents = []

for file_path in embeddings_meta_path.iterdir():
    if file_path.is_file():
        print(f"Reading: {file_path.parts}")

        with open(file_path, "r", encoding="utf-8") as file:
            content = json.load(file)
            documents.append((file_path, content))

for i, doc in enumerate(documents):
    file_path, content = doc
    embedding_path = Path(content["embedding_path"])
    embedding = np.load(embedding_path)
    embeddings.append(embedding)

embeddings = np.array(embeddings)
cluster_labels, reduced_embeddings = umap_reduce(embeddings)

for doc, label in zip(documents, cluster_labels):
    passage_path = Path(doc[1]["passage_path"])

    cluster_dir = clusters_path / str(label)
    cluster_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy(passage_path, cluster_dir / passage_path.name)

# Get current time and format it
now = datetime.now()
run_id = now.strftime("%Y-%m-%d_%H:%M:%S")


for doc, label in zip(documents, cluster_labels):
    passage_path = Path(doc[1]["passage_path"])

    cluster_dir = clusters_path / str(label)
    cluster_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy(passage_path, cluster_dir / "passages" / passage_path.name)

    meta = {
        "document_id": doc[1]["document_id"],
        "document_path": doc[1]["document_path"],
        "passage_path": str(cluster_dir / "passages" / passage_path.name),
        "passage_number": doc[1]["passage_number"],
        "passage_length": doc[1]["passage_length"],
        "embedding_path": doc[1]["embedding_path"],
        "embedding_length": doc[1]["embedding_length"],
        "cluster_label": int(label)
    }

    cluster_meta_dir = clusters_path / str(label) / "meta"
    cluster_meta_dir.mkdir(parents=True, exist_ok=True)

    with open(cluster_meta_dir / f"{run_id}.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=4)


meta = {
    "clusters": {},
    "segments": {}
}

for doc, label in zip(documents, cluster_labels):
    file_path, content = doc
    id = f"{content['document_id']}_{content['passage_number']}"
    meta["clusters"].setdefault(str(label), []).append(id)
    meta["segments"][id] = content


with open(clusters_meta_path / f"{run_id}.json", "w", encoding="utf-8") as f:
    json.dump(meta, f, ensure_ascii=False, indent=4)
