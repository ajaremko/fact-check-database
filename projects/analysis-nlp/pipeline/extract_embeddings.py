
import json
from datetime import datetime
from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files
import numpy as np
from sentence_transformers import SentenceTransformer


passages_meta_path = prepare_input_dir_from_env(
    "PASSAGES_META_PATH", "./tmp/meta/passages")
embeddings_path = prepare_output_dir_from_env(
    "EMBEDDINGS_PATH", "./tmp/data/embeddings")
embeddings_meta_path = prepare_output_dir_from_env(
    "EMBEDDINGS_META_PATH", "./tmp/meta/embeddings")


events = read_json_files(passages_meta_path)

passages = []

for i, doc in enumerate(events):
    file_path, content = doc
    with open(content["article_path"], "r") as file:
        article_text = file.read()
        passages.append((article_text, content))

passages_with_prefix = [
    f"passage: {p}" for p in [p[0] for p in passages]
]

model = SentenceTransformer("intfloat/e5-base-v2")

embeddings = model.encode(
    passages_with_prefix,
    batch_size=64,
    normalize_embeddings=True,   # unit vectors: cosine == dot product
    show_progress_bar=True,
)

for (article_text, content), embedding in zip(passages, embeddings):

    embedding_id = f"{content["passage_id"]}"
    embedding_path = embeddings_path / f"{embedding_id}.npy"
    np.save(embedding_path, embedding)

    passage_meta_path = embeddings_meta_path / f"{embedding_id}.json"
    meta_data = content | {
        "embedding_path": str(embedding_path),
        "embedding_length": len(embedding)
    }
    with open(passage_meta_path, "w", encoding="utf-8") as meta_file:
        json.dump(meta_data, meta_file, indent=4)
