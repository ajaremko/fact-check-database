"""Tests for NLI-based zero-shot stance prediction."""

import json

from pipeline.stance_prediction.internal.predict_stance import (
    load_passage_from_meta,
    predict_stances,
)


def test_load_passage_from_meta_reads_article_id_and_passage_text(tmp_path):
    passage_path = tmp_path / "passage.txt"
    passage_path.write_text("This is the passage text.", encoding="utf-8")

    meta_path = tmp_path / "meta.json"
    meta_path.write_text(json.dumps({
        "article_id": "abc123",
        "passage_path": str(passage_path),
    }), encoding="utf-8")

    article_id, passage_text = load_passage_from_meta(meta_path)

    assert article_id == "abc123"
    assert passage_text == "This is the passage text."


def test_predict_stances_returns_one_record_per_passage_target_pair():
    passages = [
        "The new park is a wonderful addition to the city and everyone loves it.",
        "The new park was a waste of money and residents are furious about it.",
    ]
    targets = ["park"]

    results = predict_stances(passages, targets)

    assert len(results) == 2
    for result in results:
        assert result["target"] == "park"
        assert result["label"] in {"pro", "against", "neutral"}
        assert set(result["scores"].keys()) == {"pro", "against", "neutral"}
        assert abs(sum(result["scores"].values()) - 1.0) < 1e-3


def test_predict_stances_labels_match_obvious_sentiment():
    passages = [
        "The new park is a wonderful addition to the city and everyone loves it.",
        "The new park was a waste of money and residents are furious about it.",
    ]
    targets = ["park"]

    results = predict_stances(passages, targets)

    assert results[0]["label"] == "pro"
    assert results[1]["label"] == "against"
