"""Tests for the PMI-style keyword scoring in PMIScorer."""

from collections import Counter

import pytest

from pipeline.stance_prediction.internal.PMIScorer import PMIScorer, _count_terms


def test_score_cluster_ranks_by_relative_enrichment():
    scorer = PMIScorer()
    scorer.corpus_counts = Counter({"election": 100, "weather": 100, "stadium": 50})
    scorer.corpus_total = 1000
    cluster_counts = Counter({"election": 40, "weather": 5, "stadium": 10})

    result = scorer.score_cluster(cluster_counts, top_k=10, min_count=2)

    assert result == ["election", "stadium", "weather"]


def test_score_cluster_respects_top_k():
    scorer = PMIScorer()
    scorer.corpus_counts = Counter({"a": 10, "b": 10, "c": 10, "d": 10})
    scorer.corpus_total = 1000
    cluster_counts = Counter({"a": 50, "b": 30, "c": 10, "d": 2})

    assert scorer.score_cluster(cluster_counts, top_k=2, min_count=2) == ["a", "b"]
    assert scorer.score_cluster(cluster_counts, top_k=10, min_count=2) == [
        "a",
        "b",
        "c",
        "d",
    ]


def test_score_cluster_min_count_filters_low_frequency_words():
    scorer = PMIScorer()
    scorer.corpus_counts = Counter({"rare": 5, "common": 5})
    scorer.corpus_total = 100
    cluster_counts = Counter({"rare": 1, "common": 2})

    # default min_count=2 excludes "rare" (count of 1)
    assert scorer.score_cluster(cluster_counts, top_k=10) == ["common"]
    # count == min_count is included (boundary is exclusive only below it)
    assert scorer.score_cluster(cluster_counts, top_k=10, min_count=1) == [
        "common",
        "rare",
    ]


def test_score_cluster_alpha_smoothing_affects_ranking():
    cluster_counts = {"alpha_word": 1, "beta_word": 5}
    corpus_counts = Counter({"alpha_word": 2, "beta_word": 7})

    scorer_no_smoothing = PMIScorer(alpha=0)
    scorer_no_smoothing.corpus_counts = corpus_counts
    scorer_no_smoothing.corpus_total = 1000
    assert scorer_no_smoothing.score_cluster(cluster_counts, top_k=10, min_count=1) == [
        "beta_word",
        "alpha_word",
    ]

    scorer_default_smoothing = PMIScorer(alpha=1)
    scorer_default_smoothing.corpus_counts = corpus_counts
    scorer_default_smoothing.corpus_total = 1000
    assert scorer_default_smoothing.score_cluster(
        cluster_counts, top_k=10, min_count=1
    ) == ["alpha_word", "beta_word"]


def test_score_cluster_raises_on_empty_corpus():
    scorer = PMIScorer()

    with pytest.raises(ValueError, match="Corpus is empty"):
        scorer.score_cluster({"x": 5})


def test_score_cluster_raises_when_word_missing_from_background():
    scorer = PMIScorer()
    scorer.corpus_counts = Counter({"known": 10})
    scorer.corpus_total = 100

    with pytest.raises(ZeroDivisionError):
        scorer.score_cluster({"unknown": 5}, min_count=1)


def test_count_terms_filters_pos_and_stopwords():
    counts = _count_terms(["The cat quickly ran to the store."])

    assert dict(counts) == {"cat": 1, "store": 1}


def test_count_terms_excludes_configured_entity_types_but_keeps_org():
    counts = _count_terms(
        [
            "Apple released a new phone in January.",
            "The company earned two million dollars.",
        ]
    )

    assert dict(counts) == {"apple": 1, "phone": 1, "company": 1}


def test_update_corpus_and_score_cluster_integration():
    scorer = PMIScorer()
    cluster_a_passages = [
        "The senator proposed a new tax reform bill.",
        "The senator debated the reform bill in the senate chamber.",
    ]
    cluster_b_passages = [
        "Scientists discovered a new species of coral in the ocean.",
    ]

    scorer.update_corpus(cluster_a_passages)
    scorer.update_corpus(cluster_b_passages)

    cluster_a_counts = _count_terms(cluster_a_passages)
    keywords_a = scorer.score_cluster(cluster_a_counts, top_k=10, min_count=1)

    # None of cluster B's exclusive terms leak into cluster A's ranking.
    assert set(keywords_a).isdisjoint({"scientist", "specie", "coral", "ocean"})
    assert set(keywords_a) == {
        "senator",
        "tax",
        "reform",
        "bill",
        "senate",
        "chamber",
    }
    # Additive smoothing (alpha=1) applies only to the numerator, so
    # singleton in-cluster words (count=1) outscore otherwise-exclusive
    # doubleton words (count=2): log2(2/1) > log2(3/2).
    assert keywords_a[:3] == ["tax", "senate", "chamber"]
