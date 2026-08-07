from collections import Counter

import matplotlib.pyplot as plt

from .report import save_matplotlib_chart


def targets_per_cluster_counts(pairing_metas):
    """pairing_metas: list of keyword_pairings/pairings/cluster_*.json
    contents. Returns a list of per-cluster target-list lengths."""
    return [len(m["targets"]) for m in pairing_metas]


def target_usage_counts(pairing_metas):
    """How many distinct clusters use each inventory word as a target
    (usage breadth, not raw corpus frequency)."""
    counts = Counter()
    for m in pairing_metas:
        counts.update(m["targets"])
    return counts


def plot_pairings(pairing_metas, inventory, output_dir):
    charts = []

    counts_per_cluster = targets_per_cluster_counts(pairing_metas)
    covered = sum(1 for c in counts_per_cluster if c > 0)
    coverage_pct = 100 * covered / len(counts_per_cluster) if counts_per_cluster else 0

    fig, ax = plt.subplots()
    ax.hist(counts_per_cluster, bins=range(0, max(counts_per_cluster, default=0) + 2))
    ax.set_title(
        f"Targets per cluster ({covered}/{len(counts_per_cluster)} clusters "
        f"covered, {coverage_pct:.1f}%)"
    )
    ax.set_xlabel("Number of targets")
    ax.set_ylabel("Number of clusters")
    charts.append(save_matplotlib_chart(
        fig,
        f"Targets per cluster ({coverage_pct:.1f}% cluster coverage)",
        output_dir, "pairings_targets_per_cluster.png"))

    usage = target_usage_counts(pairing_metas)
    top20 = usage.most_common(20)
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.barh([w for w, _ in top20][::-1], [c for _, c in top20][::-1])
    ax.set_title(f"Most-used inventory targets (out of {len(inventory)} words)")
    ax.set_xlabel("Number of clusters using this target")
    charts.append(save_matplotlib_chart(
        fig, f"Most-used inventory targets (out of {len(inventory)} words)",
        output_dir, "pairings_top_targets.png"))

    return charts
