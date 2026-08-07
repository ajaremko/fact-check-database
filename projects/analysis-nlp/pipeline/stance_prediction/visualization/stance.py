from collections import Counter

import matplotlib.pyplot as plt

from .report import save_matplotlib_chart


def label_distribution(stance_cluster_metas):
    """stance_cluster_metas: list of stance_detection/cluster_*.json
    contents. Returns a Counter of label -> number of (passage, target)
    records with that label."""
    counts = Counter()
    for m in stance_cluster_metas:
        counts.update(s["label"] for s in m["stances"])
    return counts


def confidence_margins(stance_cluster_metas):
    """Margin between the winning label's score and the runner-up's,
    across all passage-target records. Values near 0 mean the model was
    essentially undecided; values near 1 mean a confident call."""
    margins = []
    for m in stance_cluster_metas:
        for s in m["stances"]:
            ranked = sorted(s["scores"].values(), reverse=True)
            margins.append(ranked[0] - ranked[1])
    return margins


def plot_stance(stance_cluster_metas, output_dir):
    charts = []

    counts = label_distribution(stance_cluster_metas)
    labels = ["pro", "against", "neutral"]
    fig, ax = plt.subplots()
    ax.bar(labels, [counts.get(label, 0) for label in labels])
    ax.set_title("Stance label distribution (all passage-target pairs)")
    ax.set_ylabel("Number of records")
    charts.append(save_matplotlib_chart(
        fig, "Stance label distribution", output_dir, "stance_label_distribution.png"))

    margins = confidence_margins(stance_cluster_metas)
    fig, ax = plt.subplots()
    ax.hist(margins, bins=30, range=(0, 1))
    ax.set_title(
        "Confidence margin (winning label score - runner-up score)\n"
        "near 0 = model is undecided; near 1 = confident call"
    )
    ax.set_xlabel("Margin")
    ax.set_ylabel("Number of records")
    charts.append(save_matplotlib_chart(
        fig, "Confidence margin distribution", output_dir,
        "stance_confidence_margins.png"))

    return charts
