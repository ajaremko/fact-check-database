import json
from pathlib import Path
from datetime import datetime

from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files
from state import read_state, write_state
from internal.segment_passage import segment_passage

timestamp = datetime.now()

current_state = read_state()
run_id = current_state.get("run_id")
output_base_path = Path(f"./tmp/stance_prediction/{run_id}/segmentation")

print(f"Starting passage segmentation for run_id: {run_id}")

articles_meta_path = prepare_input_dir_from_env(
    "ARTICLES_META_PATH", f"tmp/data/test-run/meta/articles"
)

passages_path = prepare_output_dir_from_env(
    "PASSAGES_PATH", f"{output_base_path}/passages")
passages_meta_path = prepare_output_dir_from_env(
    "PASSAGES_META_PATH", f"{output_base_path}/meta")


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
    "segmenter": {
        "run_id": run_id,
        "total_articles": len(articles),
        "total_passages": passages_count,
        "processed_at": timestamp.isoformat(),
        "input_directory": str(articles_meta_path),
        "output_directory": str(passages_meta_path),
        "duration": (datetime.now() - timestamp).total_seconds()
    }
}

current_state.update(state_update)
write_state(current_state)
