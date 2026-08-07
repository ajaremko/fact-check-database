from pipeline.stance_prediction.visualization.embeddings import most_frequent_articles


def test_most_frequent_articles_orders_by_passage_count():
    metas = [
        {"article_id": "a1"}, {"article_id": "a1"}, {"article_id": "a1"},
        {"article_id": "a2"}, {"article_id": "a2"},
        {"article_id": "a3"},
    ]

    assert most_frequent_articles(metas, n=2) == ["a1", "a2"]
