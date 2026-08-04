import umap
import hdbscan


def umap_reduce(embeddings):
    # 3. Reduce dimensions with UMAP
    # HDBSCAN works best when dimensions are reduced to 2-10 components
    umap_model = umap.UMAP(
        n_neighbors=5,
        n_components=5,
        metric='cosine',
        random_state=42
    )
    reduced_embeddings = umap_model.fit_transform(embeddings)

    # 4. Cluster with HDBSCAN
    # Use 'cosine' or 'euclidean' based on your data distribution
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=2,
        metric='euclidean',
        cluster_selection_method='eom'
    )

    cluster_labels = clusterer.fit_predict(reduced_embeddings)

    return cluster_labels, reduced_embeddings
