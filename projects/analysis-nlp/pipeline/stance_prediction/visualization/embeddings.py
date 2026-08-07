from collections import Counter

import matplotlib.pyplot as plt
import numpy as np
import plotly.express as px
import umap

from .report import save_matplotlib_chart, save_plotly_chart


def most_frequent_articles(passage_metas, n=6):
    """Article ids with the most passages, most-frequent first."""
    counts = Counter(m["article_id"] for m in passage_metas)
    return [article_id for article_id, _ in counts.most_common(n)]


def plot_embeddings(passage_metas, output_dir):
    charts = []

    embeddings = np.array([np.load(m["embedding_path"]) for m in passage_metas])

    # float64: normalized embeddings' norms differ only by float32 rounding
    # noise (~1e-7), too fine for float32 histogram bin-edge arithmetic.
    norms = np.linalg.norm(embeddings, axis=1).astype(np.float64)
    norms_min, norms_max = float(norms.min()), float(norms.max())
    if (norms_max - norms_min) < 1e-4:
        # normalized embeddings collapse to ~zero variance in norm;
        # numpy's auto-ranging can't usefully bin a near-zero-width range.
        norms_min, norms_max = norms_min - 0.5, norms_max + 0.5
    fig, ax = plt.subplots()
    ax.hist(norms, bins=30, range=(norms_min, norms_max))
    ax.set_title("Embedding norm distribution")
    ax.set_xlabel("L2 norm (expect ~1.0 - embeddings are normalized)")
    ax.set_ylabel("Number of passages")
    charts.append(save_matplotlib_chart(
        fig, "Embedding norm distribution", output_dir, "embeddings_norms.png"))

    reducer = umap.UMAP(n_components=2, random_state=42)
    coords = reducer.fit_transform(embeddings)

    overview_fig = px.scatter(
        x=coords[:, 0], y=coords[:, 1],
        hover_name=[m["passage_id"] for m in passage_metas],
        hover_data={"article_id": [m["article_id"] for m in passage_metas]},
        title="All passage embeddings (UMAP projection)",
    )
    charts.append(save_plotly_chart(
        overview_fig, "All passage embeddings (UMAP projection)"))

    # Focused check: passages from the same few articles, colored by article,
    # to visually confirm passages within an article are no longer collapsed
    # onto identical points (the article_path/passage_path embedding bug fix).
    focus_title = "Passage spread within the most-segmented articles (UMAP projection)"
    focus_articles = set(most_frequent_articles(passage_metas))
    focus_idx = [
        i for i, m in enumerate(passage_metas) if m["article_id"] in focus_articles
    ]
    focus_fig = px.scatter(
        x=coords[focus_idx, 0], y=coords[focus_idx, 1],
        color=[passage_metas[i]["article_id"] for i in focus_idx],
        hover_name=[passage_metas[i]["passage_id"] for i in focus_idx],
        title=focus_title,
    )
    charts.append(save_plotly_chart(focus_fig, focus_title))

    return charts
