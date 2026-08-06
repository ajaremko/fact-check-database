"""Tests for aggregating per-passage stances into per-article, per-keyword scores."""

from pipeline.stance_prediction.internal.aggregate_stances import aggregate_stances


def test_aggregate_stances_sums_and_averages_within_a_group():
    stance_records = [
        {
            "article_id": "article-1",
            "target": "vaccine",
            "scores": {"pro": 0.8, "against": 0.1, "neutral": 0.1},
        },
        {
            "article_id": "article-1",
            "target": "vaccine",
            "scores": {"pro": 0.6, "against": 0.3, "neutral": 0.1},
        },
    ]

    results = aggregate_stances(stance_records)

    assert len(results) == 1
    result = results[0]
    assert result["article_id"] == "article-1"
    assert result["target"] == "vaccine"
    assert result["num_passages"] == 2
    assert result["sum_scores"] == {"pro": 1.4, "against": 0.4, "neutral": 0.2}
    assert result["avg_scores"] == {"pro": 0.7, "against": 0.2, "neutral": 0.1}
    assert result["label"] == "pro"


def test_aggregate_stances_keeps_different_articles_and_targets_separate():
    stance_records = [
        {
            "article_id": "article-1",
            "target": "vaccine",
            "scores": {"pro": 0.9, "against": 0.05, "neutral": 0.05},
        },
        {
            "article_id": "article-2",
            "target": "vaccine",
            "scores": {"pro": 0.1, "against": 0.8, "neutral": 0.1},
        },
        {
            "article_id": "article-1",
            "target": "senate",
            "scores": {"pro": 0.2, "against": 0.1, "neutral": 0.7},
        },
    ]

    results = aggregate_stances(stance_records)

    grouped = {(r["article_id"], r["target"]): r for r in results}
    assert len(grouped) == 3
    assert grouped[("article-1", "vaccine")]["label"] == "pro"
    assert grouped[("article-2", "vaccine")]["label"] == "against"
    assert grouped[("article-1", "senate")]["label"] == "neutral"
    for r in results:
        assert r["num_passages"] == 1
