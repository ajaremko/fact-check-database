from collections import Counter


def build_keyword_inventory(keywords_by_cluster, corpus_counts, top_n=75):
    """keywords_by_cluster: {cluster_id: top-10 PMI keyword list (first-name filtered)}
    corpus_counts: the PMIScorer's background Counter."""
    candidates = Counter()
    for kws in keywords_by_cluster.values():
        for w in kws:
            # cluster-presence count
            candidates[w] += 1
    # rank by (breadth, then raw frequency) and take top_n
    ranked = sorted(candidates,
                    key=lambda w: (candidates[w], corpus_counts[w]),
                    reverse=True)
    return set(ranked[:top_n])
