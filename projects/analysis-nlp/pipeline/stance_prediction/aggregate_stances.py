import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from batch_io import read_json_files
from internal.aggregate_stances import aggregate_stances
from state import read_state, write_state

timestamp = datetime.now()

current_state = read_state()
run_id = current_state.get("run_id")
output_base_path = Path(f"./tmp/stance_prediction/{run_id}/stance_aggregation")
articles_output_path = output_base_path / "articles"
articles_output_path.mkdir(parents=True, exist_ok=True)

stance_detection = current_state["stance_detection"]
if not stance_detection:
    raise ValueError(
        "Stance detection state is missing in the current state.")

print(f"Starting stance aggregation for run_id: {run_id}")

stance_detection_path = Path(stance_detection["output_directory"])
events = read_json_files(stance_detection_path)

all_records = []
for _file_path, content in events:
    all_records.extend(content["stances"])

aggregated = aggregate_stances(all_records)

by_article = defaultdict(list)
for record in aggregated:
    by_article[record["article_id"]].append({
        "target": record["target"],
        "label": record["label"],
        "sum_scores": record["sum_scores"],
        "avg_scores": record["avg_scores"],
        "num_passages": record["num_passages"],
    })

for article_id, stances in by_article.items():
    output_path = articles_output_path / f"{article_id}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "article_id": article_id,
            "stances": stances,
        }, f, ensure_ascii=False, indent=2)

state_update = {
    "stance_aggregation": {
        "run_id": run_id,
        "processed_at": timestamp.isoformat(),
        "stance_detection_path": str(stance_detection_path),
        "output_directory": str(articles_output_path),
        "total_articles": len(by_article),
        "total_article_keyword_pairs": len(aggregated),
        "duration": (datetime.now() - timestamp).total_seconds(),
    }
}

current_state = read_state()
current_state.update(state_update)
write_state(current_state)
