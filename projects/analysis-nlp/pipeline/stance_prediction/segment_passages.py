import argparse
import json
from pathlib import Path
from datetime import datetime

from batch_io import prepare_output_dir_from_env, read_json_files
from state import read_state, write_state
from internal.segment_passage import segment_passage

timestamp = datetime.now()

parser = argparse.ArgumentParser()
parser.add_argument(
    "--root_dir",
    required=True,
    help="Directory of the pipeline run output",
)
args = parser.parse_args()

current_state = read_state(args.root_dir)
input_dir = current_state.get("input_dir")
articles_meta_path = Path(input_dir)

output_base_path = Path(f"{args.root_dir}/passage_segmentation")

passages_path = Path(f"{output_base_path}/passages")
passages_path.mkdir(parents=True, exist_ok=True)

passages_meta_path = Path(f"{output_base_path}/meta")
passages_meta_path.mkdir(parents=True, exist_ok=True)


events = read_json_files(articles_meta_path)

articles = []

for i, doc in enumerate(events):
    file_path, content = doc
    with open(content["article_path"], "r") as file:
        article_text = file.read()
        articles.append((article_text, content))

passages_count = 0

for article_text, content in articles:
    segments = segment_passage(article_text)
    for i, segment in enumerate(segments):

        passage_id = f"{content["article_id"]}_{i+1}"
        passage_path = passages_path / f"{passage_id}.txt"
        with open(passage_path, "w", encoding="utf-8") as file:
            file.write(segment)

        passage_meta_path = passages_meta_path / f"{passage_id}.json"
        meta_data = content | {
            "passage_id": passage_id,
            "passage_index": i + 1,
            "passage_path": str(passage_path),
            "passage_words": len(segment.split()),
            "passage_characters": len(segment),
        }

        with open(passage_meta_path, "w", encoding="utf-8") as meta_file:
            json.dump(meta_data, meta_file, indent=4)

        passages_count += 1

state_update = {
    "passage_segmentation": {
        "total_articles": len(articles),
        "total_passages": passages_count,
        "processed_at": timestamp.isoformat(),
        "input_directory": str(articles_meta_path),
        "output_directory": str(passages_meta_path),
        "duration": (datetime.now() - timestamp).total_seconds()
    }
}

current_state.update(state_update)
write_state(args.root_dir, current_state)
