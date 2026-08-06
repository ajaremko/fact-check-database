import os
import json
from datasets import load_dataset
from pathlib import Path
from datetime import datetime

from batch_io import prepare_input_dir_from_env, read_json_files, read_subdirectories, hash_sha256
from state import read_state, write_state

timestamp = datetime.now()
run_id = timestamp.strftime("%Y-%m-%d_%H:%M:%S")

output_base_path = os.getenv("OUTPUT_PATH", "./tmp/data")

articles_path = Path(f"{output_base_path}/{run_id}/articles")
articles_path.mkdir(parents=True, exist_ok=True)

articles_meta_path = Path(f"{output_base_path}/{run_id}/meta")
articles_meta_path.mkdir(parents=True, exist_ok=True)

# Load the news articles **crawled** in the year 2016 (but not necessarily published in 2016), in streaming mode
# `name` can be one of 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024
dataset = load_dataset("stanford-oval/ccnews", name="2016", streaming=True)


for i, article in enumerate(dataset["train"].take(1000)):
    if article["language"] != "en":
        continue  # Skip non-English articles
    article_id = hash_sha256(json.dumps(article))
    article_path = articles_path / f"{article_id}.txt"
    text = article["plain_text"]
    with open(article_path, "w", encoding="utf-8") as f:
        f.write(text)

    article_meta_path = articles_meta_path / f"{article_id}.json"

    meta_data = {
        "article_id": article_id,
        "source": {
            "requested_url": article.get("requested_url", ""),
            "source_hash": article_id,
            'published_date': article.get('published_date', ''),
            'title': article.get('title', ''),
            'tags': article.get('tags', ''),
            'categories': article.get('categories', ''),
            'author': article.get('author', ''),
            'sitename': article.get('sitename', ''),
            'image_url': article.get('image_url', ''),
            'language': article.get('language', ''),
            'language_score': article.get('language_score', 0.0),
            'responded_url': article.get('responded_url', ''),
            'publisher': article.get('publisher', ''),
            'warc_path': article.get('warc_path', ''),
            'crawl_date': article.get('crawl_date', '')
        },
        "processed_at": timestamp.isoformat(),
        "article_words": len(text.split()),
        "article_characters": len(text),
        "article_path": str(article_path)
    }

    with open(article_meta_path, "w", encoding="utf-8") as meta_file:
        json.dump(meta_data, meta_file, indent=4)
