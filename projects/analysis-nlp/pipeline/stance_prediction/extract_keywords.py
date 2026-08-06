import json
from pathlib import Path
from datetime import datetime

from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files
from state import read_state, write_state
from internal.PMIScorer import PMIScorer, _count_terms

timestamp = datetime.now()

current_state = read_state()
run_id = current_state.get("run_id")
output_base_path = Path(
    f"./tmp/stance_prediction/{run_id}/keyword_extraction")
output_base_path.mkdir(parents=True, exist_ok=True)

keywords_output_path = output_base_path / "keywords"
keywords_output_path.mkdir(parents=True, exist_ok=True)

clusterer = current_state["clusterer"]
if not clusterer:
    raise ValueError("Clusterer state is missing in the current state.")

print(f"Starting keyword extraction for run_id: {run_id}")

clusterer_result_path = Path(clusterer["result_path"])

with open(clusterer_result_path, "r", encoding="utf-8") as f:
    clusterer_result = json.load(f)

scorer = PMIScorer()
passages_by_cluster = {}

# Load passages for each cluster
for key, cluster_item in clusterer_result.items():
    passages = []
    for item in cluster_item:
        with open(item["passage_path"], "r", encoding="utf-8") as f:
            passage_data = f.read()
            passages.append(passage_data)

    passages_by_cluster[key] = passages

# Update the corpus with all passages across clusters
for key, passages in passages_by_cluster.items():
    scorer.update_corpus(passages)

# Score each cluster and save the keywords and metadata
for key, passages in passages_by_cluster.items():
    cluster_counts = _count_terms(passages)
    keywords = scorer.score_cluster(cluster_counts, top_k=10, min_count=2)
    keywords_path = keywords_output_path / f"cluster_{key}.json"

    meta = {
        "keywords": keywords,
        "cluster_id": key,
        "num_passages": len(passages),
        "passage_paths": [item["passage_path"] for item in clusterer_result[key]],
    }

    with open(keywords_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

corpus_counts_path = output_base_path / "corpus_counts.json"
corpus_counts = scorer.get_corpus_counts()

with open(corpus_counts_path, "w", encoding="utf-8") as f:
    json.dump(corpus_counts, f, ensure_ascii=False, indent=2)

state_update = {
    "keyword_extraction": {
        "run_id": run_id,
        "processed_at": timestamp.isoformat(),
        "clusters_path": str(clusterer_result_path),
        "total_clusters": len(clusterer_result),
        "output_directory": str(keywords_output_path),
        "corpus_counts_path": str(corpus_counts_path)
    }
}

current_state.update(state_update)
write_state(current_state)
