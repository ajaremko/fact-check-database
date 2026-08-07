from pipeline.stance_prediction.visualization.clustering import cluster_size_counts


def test_cluster_size_counts():
    results = {
        "0": [{"article_id": "a"}, {"article_id": "b"}],
        "1": [{"article_id": "c"}],
    }

    assert cluster_size_counts(results) == {"0": 2, "1": 1}
