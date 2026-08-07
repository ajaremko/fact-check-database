from collections import Counter

import matplotlib.pyplot as plt

from .report import save_matplotlib_chart


def passages_per_article_counts(passage_metas):
    """passage_metas: list of segmentation-stage metadata dicts.
    Returns {article_id: number of passages}."""
    return dict(Counter(m["article_id"] for m in passage_metas))


def plot_segmentation(passage_metas, output_dir):
    charts = []

    word_counts = [m["passage_words"] for m in passage_metas]
    fig, ax = plt.subplots()
    ax.hist(word_counts, bins=30)
    ax.set_title("Passage word count distribution")
    ax.set_xlabel("Words per passage")
    ax.set_ylabel("Number of passages")
    charts.append(save_matplotlib_chart(
        fig, "Passage word count distribution", output_dir,
        "segmentation_word_counts.png"))

    per_article_counts = list(passages_per_article_counts(passage_metas).values())
    fig, ax = plt.subplots()
    ax.hist(per_article_counts, bins=range(1, max(per_article_counts) + 2))
    ax.set_title("Passages per article")
    ax.set_xlabel("Passages per article")
    ax.set_ylabel("Number of articles")
    charts.append(save_matplotlib_chart(
        fig, "Passages per article", output_dir,
        "segmentation_passages_per_article.png"))

    return charts
