from sklearn.cluster import AgglomerativeClustering


def agglomerative_clustering(embeddings):
    clusterer = AgglomerativeClustering(
        n_clusters=None,
        metric="cosine",
        linkage="average",
        distance_threshold=0.20,   # = 1 - cosine sim; calibrate from step 3
    )
    labels = clusterer.fit_predict(embeddings)
    return labels, embeddings
