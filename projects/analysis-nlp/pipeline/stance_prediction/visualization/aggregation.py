from collections import Counter

import matplotlib.pyplot as plt

from .report import save_matplotlib_chart


def label_distribution(article_metas):
    """article_metas: list of stance_aggregation/articles/*.json contents.
    Returns a Counter of label -> number of (article, target) pairs."""
    counts = Counter()
    for m in article_metas:
        counts.update(s["label"] for s in m["stances"])
    return counts


def top_recurring_targets(article_metas, n=10):
    """Target keywords that recur across the most distinct articles,
    most-frequent first."""
    counts = Counter()
    for m in article_metas:
        counts.update({s["target"] for s in m["stances"]})
    return [target for target, _ in counts.most_common(n)]


def pro_lean_by_target(article_metas, targets):
    """{target: [pro_lean per article that mentions it]}, where
    pro_lean = avg_pro - avg_against (positive leans pro, negative
    leans against)."""
    wanted = set(targets)
    leans = {target: [] for target in targets}
    for m in article_metas:
        for s in m["stances"]:
            if s["target"] in wanted:
                lean = s["avg_scores"]["pro"] - s["avg_scores"]["against"]
                leans[s["target"]].append(lean)
    return leans


def plot_aggregation(article_metas, output_dir):
    charts = []

    counts = label_distribution(article_metas)
    labels = ["pro", "against", "neutral"]
    fig, ax = plt.subplots()
    ax.bar(labels, [counts.get(label, 0) for label in labels])
    ax.set_title("Aggregated stance label distribution (article-keyword pairs)")
    ax.set_ylabel("Number of article-keyword pairs")
    charts.append(save_matplotlib_chart(
        fig, "Aggregated stance label distribution", output_dir,
        "aggregation_label_distribution.png"))

    num_passages = [s["num_passages"] for m in article_metas for s in m["stances"]]
    fig, ax = plt.subplots()
    ax.hist(num_passages, bins=range(1, max(num_passages, default=1) + 2))
    ax.set_title("Passages contributing to each article-keyword score")
    ax.set_xlabel("num_passages")
    ax.set_ylabel("Number of article-keyword pairs")
    charts.append(save_matplotlib_chart(
        fig, "Passages contributing to each article-keyword score", output_dir,
        "aggregation_num_passages.png"))

    top_targets = top_recurring_targets(article_metas, n=10)
    if top_targets:
        leans = pro_lean_by_target(article_metas, top_targets)
        fig, ax = plt.subplots(figsize=(9, 6))
        ax.boxplot([leans[t] for t in top_targets], tick_labels=top_targets, vert=False)
        ax.axvline(0, color="gray", linestyle="--", linewidth=1)
        ax.set_title(
            "Cross-article stance spread for the most-recurring targets\n"
            "(each box: how much articles disagree on the same keyword)"
        )
        ax.set_xlabel("Pro-lean (avg_pro - avg_against); negative leans against")
        charts.append(save_matplotlib_chart(
            fig, "Cross-article stance spread for most-recurring targets",
            output_dir, "aggregation_cross_article_spread.png"))

    return charts
