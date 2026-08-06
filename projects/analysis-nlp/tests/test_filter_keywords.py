"""Tests for first-name filtering applied to PMI keyword candidates."""

from pipeline.stance_prediction.internal.filter_keywords import filter_first_names


def test_filter_first_names_removes_common_first_names():
    keywords = ["michael", "reform", "jessica", "senate"]

    assert filter_first_names(keywords) == ["reform", "senate"]


def test_filter_first_names_leaves_non_name_words_unchanged():
    keywords = ["reform", "senate", "chamber"]

    assert filter_first_names(keywords) == ["reform", "senate", "chamber"]
