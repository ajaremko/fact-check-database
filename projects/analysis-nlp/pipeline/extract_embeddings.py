# pip install sentence-transformers
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("intfloat/e5-base-v2")

passages = [
    "passage: " + p for p in [
        "The international community pledged support to Ukraine.",
        "Western nations reaffirmed their commitment to Kyiv's defense.",
        "The quarterly earnings report showed record profits.",
    ]
]

embeddings = model.encode(
    passages,
    batch_size=64,
    normalize_embeddings=True,   # unit vectors: cosine == dot product
    show_progress_bar=True,
)
print(embeddings.shape) 