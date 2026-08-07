from pipeline.stance_prediction.visualization.keywords import (
    keywords_per_cluster_counts,
)


def test_keywords_per_cluster_counts():
    cluster_metas = [
        {"keywords": ["a", "b", "c"]},
        {"keywords": []},
        {"keywords": ["d"]},
    ]

    assert keywords_per_cluster_counts(cluster_metas) == [3, 0, 1]
