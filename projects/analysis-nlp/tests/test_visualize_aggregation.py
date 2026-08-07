from pipeline.stance_prediction.visualization.aggregation import (
    label_distribution,
    pro_lean_by_target,
    top_recurring_targets,
)


def test_label_distribution():
    article_metas = [
        {"stances": [
            {"label": "pro", "target": "a"},
            {"label": "against", "target": "b"},
        ]},
        {"stances": [{"label": "pro", "target": "a"}]},
    ]

    assert label_distribution(article_metas) == {"pro": 2, "against": 1}


def test_top_recurring_targets_orders_by_article_count():
    article_metas = [
        {"stances": [{"target": "a"}, {"target": "b"}]},
        {"stances": [{"target": "a"}]},
        {"stances": [{"target": "c"}]},
    ]

    assert top_recurring_targets(article_metas, n=2) == ["a", "b"]


def test_pro_lean_by_target():
    article_metas = [
        {"stances": [
            {"target": "a", "avg_scores": {"pro": 0.7, "against": 0.2, "neutral": 0.1}},
        ]},
        {"stances": [
            {"target": "a", "avg_scores": {"pro": 0.1, "against": 0.8, "neutral": 0.1}},
        ]},
    ]

    leans = pro_lean_by_target(article_metas, ["a"])

    assert leans["a"] == [0.7 - 0.2, 0.1 - 0.8]
