from pipeline.stance_prediction.visualization.stance import (
    confidence_margins,
    label_distribution,
)


def test_label_distribution():
    stance_cluster_metas = [
        {"stances": [{"label": "pro"}, {"label": "against"}]},
        {"stances": [{"label": "pro"}]},
    ]

    counts = label_distribution(stance_cluster_metas)

    assert counts == {"pro": 2, "against": 1}


def test_confidence_margins():
    stance_cluster_metas = [
        {"stances": [
            {"scores": {"pro": 0.9, "against": 0.05, "neutral": 0.05}},
            {"scores": {"pro": 0.4, "against": 0.35, "neutral": 0.25}},
        ]},
    ]

    margins = confidence_margins(stance_cluster_metas)

    assert margins[0] == 0.9 - 0.05
    assert abs(margins[1] - (0.4 - 0.35)) < 1e-9
