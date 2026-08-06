"""Tests for the global keyword-inventory construction used in keyword pairing."""

from pipeline.stance_prediction.internal.build_keyword_inventory import (
    build_keyword_inventory,
)


def test_build_keyword_inventory_ranks_by_raw_frequency():
    corpus_counts = {"a": 10, "b": 5, "c": 20, "d": 1}

    assert build_keyword_inventory(corpus_counts, top_n=2) == {"c", "a"}


def test_build_keyword_inventory_returns_all_when_top_n_exceeds_vocab():
    corpus_counts = {"a": 3, "b": 7}

    assert build_keyword_inventory(corpus_counts, top_n=10) == {"a", "b"}
