import os
import json
from pathlib import Path
import shutil
from datetime import datetime
from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files, read_subdirectories, hash_sha256

basil_root_path = prepare_input_dir_from_env("BASIL_PATH", "./BASIL/articles")
basil_article_paths = read_subdirectories(basil_root_path)

articles_path = prepare_output_dir_from_env(
    "ARTICLES_PATH", f"./tmp/data/articles")
articles_meta_path = prepare_output_dir_from_env(
    "ARTICLES_META_PATH", f"./tmp/meta/articles")

timestamp = datetime.now()

for subdir_path in basil_article_paths:
    print(f"Processing article directory: {subdir_path.stem}")
    documents = read_json_files(subdir_path)

    for i, doc in enumerate(documents):
        file_path, content = doc
        article_id = file_path.stem
        text = ""

        paras = content.get("body-paragraphs", [])
        for lines in paras:
            paragraph_text = " ".join(lines)
            text += paragraph_text + "\n"

        article_path = articles_path / f"{article_id}.txt"

        with open(articles_path / f"{article_id}.txt", "w", encoding="utf-8") as file:
            file.write(text)

        article_meta_path = articles_meta_path / f"{article_id}.json"

        meta_data = {
            "article_id": article_id,
            "source": {
                "source_file": str(file_path),
                "source_hash": hash_sha256(json.dumps(content)),
                "triplet-uuid": content.get("triplet-uuid", ""),
                "date": content.get("date", ""),
                "title": content.get("title", ""),
                "keywords": content.get("keywords", ""),
                "word-count": content.get("word-count", 0),
                "main-event": content.get("main-event", ""),
                "source": content.get("source", ""),
                "url": content.get("url", ""),
                "uuid": content.get("uuid", ""),
                "main-entities": content.get("main-entities", []),
                "body-paragraphs": len(paras),
            },
            "num_words": len(text.split()),
            "num_characters": len(text),
            "processed_at": timestamp.isoformat()
        }

        with open(article_meta_path, "w", encoding="utf-8") as meta_file:
            json.dump(meta_data, meta_file, indent=4)
