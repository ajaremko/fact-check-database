import argparse
import json
from pathlib import Path
from datetime import datetime

from state import read_state, write_state
from internal.PMIScorer import PMIScorer, _count_terms
from internal.filter_keywords import filter_first_names

timestamp = datetime.now()

parser = argparse.ArgumentParser()
parser.add_argument(
    "--root_dir",
    required=True,
    help="Directory of the pipeline run output",
)
args = parser.parse_args()

current_state = read_state(args.root_dir)
output_base_path = Path(
    f"{args.root_dir}/keyword_extraction")
output_base_path.mkdir(parents=True, exist_ok=True)

clusterer = current_state["embedding_clustering"]
if not clusterer:
    raise ValueError("Clusterer state is missing in the current state.")


keywords_output_path = output_base_path / "keywords"
keywords_output_path.mkdir(parents=True, exist_ok=True)

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
    candidate_words = filter_first_names(cluster_counts.keys())
    cluster_counts = {w: cluster_counts[w] for w in candidate_words}
    keywords = scorer.score_cluster(cluster_counts, top_k=10, min_count=2)
    keywords_path = keywords_output_path / f"cluster_{key}.json"

    meta = {
        "keywords": keywords,
        "cluster_id": key,
        "num_passages": len(passages),
        "passage_meta_paths": [
            item["passage_meta_path"] for item in clusterer_result[key]
        ],
    }

    with open(keywords_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

corpus_counts_path = output_base_path / "corpus_counts.json"
corpus_counts = scorer.get_corpus_counts()

with open(corpus_counts_path, "w", encoding="utf-8") as f:
    json.dump(corpus_counts, f, ensure_ascii=False, indent=2)

state_update = {
    "keyword_extraction": {
        "processed_at": timestamp.isoformat(),
        "clusters_path": str(clusterer_result_path),
        "total_clusters": len(clusterer_result),
        "output_directory": str(keywords_output_path),
        "corpus_counts_path": str(corpus_counts_path),
        "duration": (datetime.now() - timestamp).total_seconds()
    }
}

current_state.update(state_update)
write_state(args.root_dir, current_state)
