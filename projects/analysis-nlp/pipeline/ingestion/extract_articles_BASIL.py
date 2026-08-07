import argparse
import os
import json
from pathlib import Path
from datetime import datetime

from batch_io import read_json_files, read_subdirectories, hash_sha256
from state import read_state, write_state

parser = argparse.ArgumentParser()
parser.add_argument(
    "--input_dir",
    default="./BASIL/articles",
    help="Directory of BASIL article JSON files",
)
parser.add_argument(
    "--output_dir",
    default="./tmp",
    help="Directory to store extracted BASIL article files",
)
args = parser.parse_args()

timestamp = datetime.now()

output_base_path = Path(args.output_dir) / \
    "basil_data" / \
    f"timestamp={timestamp.strftime('%Y-%m-%d_%H:%M:%S')}"

output_base_path.mkdir(parents=True, exist_ok=True)

basil_root_path = Path(args.input_dir)

articles_path = output_base_path / "articles"
articles_path.mkdir(parents=True, exist_ok=True)

articles_meta_path = output_base_path / "meta"
articles_meta_path.mkdir(parents=True, exist_ok=True)

article_count = 0

basil_article_paths = read_subdirectories(basil_root_path)


for subdir_path in basil_article_paths:

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
            "processed_at": timestamp.isoformat(),
            "article_words": len(text.split()),
            "article_characters": len(text),
            "article_path": str(article_path)
        }

        with open(article_meta_path, "w", encoding="utf-8") as meta_file:
            json.dump(meta_data, meta_file, indent=4)

        article_count += 1

duration = datetime.now() - timestamp

state_update = {
    "BASIL_extractor": {
        "timestamp": timestamp.isoformat(),
        "total_articles": article_count,
        "articles_path": str(articles_path),
        "duration_seconds": duration.total_seconds(),
        "input_directory": str(basil_root_path),
        "output_directory": str(articles_meta_path)
    }
}

current_state = read_state()
current_state.update(state_update)
write_state(current_state)
