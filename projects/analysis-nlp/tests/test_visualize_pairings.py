from pipeline.stance_prediction.visualization.pairings import (
    target_usage_counts,
    targets_per_cluster_counts,
)


def test_targets_per_cluster_counts():
    pairing_metas = [
        {"targets": ["a", "b"]},
        {"targets": []},
        {"targets": ["c"]},
    ]

    assert targets_per_cluster_counts(pairing_metas) == [2, 0, 1]


def test_target_usage_counts():
    pairing_metas = [
        {"targets": ["a", "b"]},
        {"targets": ["a"]},
        {"targets": ["c"]},
    ]

    counts = target_usage_counts(pairing_metas)

    assert counts == {"a": 2, "b": 1, "c": 1}
