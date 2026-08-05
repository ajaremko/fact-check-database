from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/e5-base-v2")


def extract_embeddings(passages: list[str]):

    passages_with_prefix = [
        f"passage: {p}" for p in [p[0] for p in passages]
    ]

    embeddings = model.encode(
        passages_with_prefix,
        batch_size=64,
        normalize_embeddings=True,   # unit vectors: cosine == dot product
        show_progress_bar=True,
    )

    return zip(passages, embeddings)
