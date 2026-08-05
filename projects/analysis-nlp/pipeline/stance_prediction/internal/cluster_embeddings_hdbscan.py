import umap
import hdbscan


def reduce_and_hdbscan_clustering(embeddings):
    # Reduce dimensions with UMAP
    # HDBSCAN works best when dimensions are reduced to 2-10 components
    umap_model = umap.UMAP(
        n_neighbors=15,
        n_components=5,
        min_dist=0.0,
        metric='cosine',
    )
    reduced_embeddings = umap_model.fit_transform(embeddings)

    # Cluster with HDBSCAN
    # Use 'cosine' or 'euclidean' based on your data distribution
    # euclidian is good for this case
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=3,
        min_samples=2,
        metric='euclidean',
        cluster_selection_method='leaf'
    )

    cluster_labels = clusterer.fit_predict(reduced_embeddings)

    return cluster_labels, reduced_embeddings
