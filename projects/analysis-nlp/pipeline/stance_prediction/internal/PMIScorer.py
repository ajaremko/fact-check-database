import math
from collections import Counter
import en_core_web_sm
import json

nlp = en_core_web_sm.load()

EXCLUDED_ENTS = {"FAC", "LOC", "WORK_OF_ART", "DATE", "TIME",
                 "PERCENT", "MONEY", "QUANTITY", "ORDINAL", "CARDINAL"}


def _count_terms(passages):
    counts = Counter()
    for doc in nlp.pipe(passages):
        for tok in doc:
            if (tok.is_alpha and not tok.is_stop
                    and tok.pos_ in ("NOUN", "PROPN")
                    and tok.ent_type_ not in EXCLUDED_ENTS):
                counts[tok.lemma_.lower()] += 1
    return counts


class PMIScorer:
    """Background corpus statistics + per-cluster scoring, decoupled."""

    def __init__(self, alpha=1.0):
        self.alpha = alpha
        self.corpus_counts = Counter()
        self.corpus_total = 0

    def update_corpus(self, passages):
        """Call as passages are ingested — independent of any clustering."""
        counts = _count_terms(passages)
        self.corpus_counts.update(counts)
        self.corpus_total += sum(counts.values())
        return counts          # returned so callers can reuse (see below)

    def score_cluster(self, cluster_counts, top_k=10, min_count=2):
        """Rank one cluster's words against the background. P(c) omitted:
        constant within a cluster, so it cannot affect the ranking."""
        if self.corpus_total == 0:
            raise ValueError("Corpus is empty; call update_corpus first.")
        scored = []
        for w, c in cluster_counts.items():
            if c < min_count:
                continue
            p_w = self.corpus_counts[w] / self.corpus_total
            p_wc = (c + self.alpha) / self.corpus_total
            scored.append((math.log2(p_wc / p_w), w))
        return [w for _, w in sorted(scored, reverse=True)[:top_k]]
