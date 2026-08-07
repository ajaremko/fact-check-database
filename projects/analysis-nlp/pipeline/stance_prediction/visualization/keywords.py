import matplotlib.pyplot as plt

from .report import save_matplotlib_chart


def keywords_per_cluster_counts(cluster_metas):
    """cluster_metas: list of keyword_extraction/keywords/cluster_*.json
    contents. Returns a list of per-cluster keyword-list lengths."""
    return [len(m["keywords"]) for m in cluster_metas]


def plot_keywords(cluster_metas, corpus_counts, output_dir):
    charts = []

    ranked = sorted(corpus_counts.items(), key=lambda kv: kv[1], reverse=True)
    ranks = list(range(1, len(ranked) + 1))
    counts = [c for _, c in ranked]

    fig, ax = plt.subplots()
    ax.loglog(ranks, counts, marker=".", linestyle="none")
    ax.set_title("Corpus term frequency (Zipf plot)")
    ax.set_xlabel("Rank (log)")
    ax.set_ylabel("Count (log)")
    charts.append(save_matplotlib_chart(
        fig, "Corpus term frequency (Zipf plot)", output_dir, "keywords_zipf.png"))

    top20 = ranked[:20]
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh([w for w, _ in top20][::-1], [c for _, c in top20][::-1])
    ax.set_title("Top 20 corpus terms by raw frequency")
    ax.set_xlabel("Count")
    charts.append(save_matplotlib_chart(
        fig, "Top 20 corpus terms by raw frequency", output_dir, "keywords_top20.png"))

    counts_per_cluster = keywords_per_cluster_counts(cluster_metas)
    fig, ax = plt.subplots()
    ax.hist(counts_per_cluster, bins=range(0, 12))
    ax.set_title("Keywords retained per cluster (after min_count/name filtering)")
    ax.set_xlabel("Number of keywords")
    ax.set_ylabel("Number of clusters")
    charts.append(save_matplotlib_chart(
        fig, "Keywords retained per cluster", output_dir,
        "keywords_per_cluster.png"))

    return charts
