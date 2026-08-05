from datetime import datetime
from pathlib import Path
from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files
from state import read_state, write_state
import json
import numpy as np
from internal.extract_cluster_summaries import summarize_clusters


timestamp = datetime.now()

current_state = read_state()
run_id = current_state.get("run_id")
output_base_path = Path(
    f"./tmp/stance_prediction/{run_id}/summary_extraction")
output_base_path.mkdir(parents=True, exist_ok=True)

clusterer = current_state["clusterer"]
if not clusterer:
    raise ValueError("Clusterer state is missing in the current state.")

print(f"Starting summary extraction for run_id: {run_id}")

clusterer_result_path = Path(clusterer["result_path"])

with open(clusterer_result_path, "r", encoding="utf-8") as f:
    clusterer_result = json.load(f)

passages_by_cluster = {}
embeddings_by_cluster = {}
passage_embedding_pairs = []

for key, cluster_item in clusterer_result.items():
    passages = []
    embeddings = []
    for item in cluster_item:
        with open(item["passage_path"], "r", encoding="utf-8") as f:
            passage_data = f.read()
            passages.append(passage_data)
        embedding_data = np.load(item["embedding_path"])
        embeddings.append(embedding_data)
    passage_embedding_pairs.append((passages, np.vstack(embeddings)))

summaries = summarize_clusters(passage_embedding_pairs)

for s in summaries:
    print("---------------------\n")
    print(s)

# for key, passages in passages_by_cluster.items():
#     cluster_counts = _count_terms(passages)
#     keywords = scorer.score_cluster(cluster_counts, top_k=10, min_count=2)

#     keyword_summary_path = keyword_summaries_path / \
#         f"cluster_{key}_keywords.json"
#     keyword_summary = {
#         "keywords": keywords
#     }
#     with open(keyword_summary_path, "w", encoding="utf-8") as f:
#         json.dump(keyword_summary, f, ensure_ascii=False, indent=2)

#     keyword_summary_meta_path = keyword_summaries_meta_path / \
#         f"cluster_{key}_keywords_meta.json"
#     keyword_summary_meta = {
#         "cluster_id": key,
#         "num_passages": len(passages),
#         "keyword_summary_path": str(keyword_summary_path)
#     }
#     with open(keyword_summary_meta_path, "w", encoding="utf-8") as f:
#         json.dump(keyword_summary_meta, f, ensure_ascii=False, indent=2)

# for filepath, content in events:
#     run_id = content["run_id"]
#     clusters = content["clusters"]
#     passages_by_cluster = {int(cid): [p["passage_text"] for p in ps]
#                            for cid, ps in clusters.items() if int(cid) != -1}
#     keywords = cluster_keywords(passages_by_cluster, top_k=10, alpha=1.0)
#     print(f"Run ID: {run_id}")
#     print(f"Keywords by cluster: {keywords}")

# state_update = {
#     "keyword_summarizer": {
#         "run_id": run_id,
#     }
# }

# current_state.update(state_update)
# write_state(current_state)
