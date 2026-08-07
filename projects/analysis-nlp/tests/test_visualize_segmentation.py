from pipeline.stance_prediction.visualization.segmentation import (
    passages_per_article_counts,
)


def test_passages_per_article_counts():
    metas = [
        {"article_id": "a1"},
        {"article_id": "a1"},
        {"article_id": "a2"},
    ]

    assert passages_per_article_counts(metas) == {"a1": 2, "a2": 1}
