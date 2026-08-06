from collections import defaultdict


def aggregate_stances(stance_records):
    """stance_records: flat list of dicts with 'article_id', 'target',
    'scores' (each a {'pro','against','neutral'} dict). Returns one
    record per (article_id, target) pair: sum_scores, avg_scores,
    label (argmax of avg_scores), num_passages."""
    sums = defaultdict(lambda: {"pro": 0.0, "against": 0.0, "neutral": 0.0})
    counts = defaultdict(int)
    for r in stance_records:
        key = (r["article_id"], r["target"])
        for label, score in r["scores"].items():
            sums[key][label] += score
        counts[key] += 1

    results = []
    for (article_id, target), sum_scores in sums.items():
        n = counts[(article_id, target)]
        avg_scores = {label: total / n for label, total in sum_scores.items()}
        results.append({
            "article_id": article_id,
            "target": target,
            "sum_scores": sum_scores,
            "avg_scores": avg_scores,
            "label": max(avg_scores, key=avg_scores.get),
            "num_passages": n,
        })
    return results
