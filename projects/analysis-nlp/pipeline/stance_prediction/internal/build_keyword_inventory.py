def build_keyword_inventory(corpus_counts, top_n=1500):
    """Top-N noun entities by raw corpus frequency ("popular topics"),
    per Hanley et al. — independent of per-cluster PMI selection."""
    ranked = sorted(corpus_counts, key=corpus_counts.get, reverse=True)
    return set(ranked[:top_n])
