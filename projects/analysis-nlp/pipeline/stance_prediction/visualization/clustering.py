import matplotlib.pyplot as plt
import numpy as np
import plotly.express as px
import umap

from .report import save_matplotlib_chart, save_plotly_chart


def cluster_size_counts(results):
    """results: the loaded embedding_clustering/results.json dict
    ({cluster_id: [items...]}). Returns {cluster_id: passage count}."""
    return {cluster_id: len(items) for cluster_id, items in results.items()}


def plot_clustering(results, output_dir):
    charts = []

    sizes = cluster_size_counts(results)
    size_values = list(sizes.values())
    singleton_count = sum(1 for s in size_values if s == 1)

    title = (
        f"Cluster size distribution "
        f"({len(sizes)} clusters, {singleton_count} singleton)"
    )
    fig, ax = plt.subplots()
    ax.hist(size_values, bins=range(1, max(size_values) + 2))
    ax.set_title(title)
    ax.set_xlabel("Passages per cluster")
    ax.set_ylabel("Number of clusters")
    charts.append(save_matplotlib_chart(
        fig, title, output_dir, "clustering_sizes.png"))

    items = [(cluster_id, item) for cluster_id, cluster_items in results.items()
             for item in cluster_items]
    embeddings = np.array([np.load(item["embedding_path"]) for _, item in items])
    cluster_ids = [cluster_id for cluster_id, _ in items]
    cluster_sizes_per_point = [sizes[cluster_id] for cluster_id in cluster_ids]
    article_ids = [item["article_id"] for _, item in items]

    reducer = umap.UMAP(n_components=2, random_state=42)
    coords = reducer.fit_transform(embeddings)

    fig = px.scatter(
        x=coords[:, 0], y=coords[:, 1],
        color=cluster_sizes_per_point,
        color_continuous_scale="Viridis",
        hover_name=cluster_ids,
        hover_data={"article_id": article_ids},
        labels={"color": "cluster size"},
        title="Clustered passage embeddings (UMAP projection, colored by cluster size)",
    )
    charts.append(save_plotly_chart(
        fig, "Clustered passage embeddings (UMAP projection, colored by cluster size)"))

    return charts
