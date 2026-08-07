import argparse
import json
from pathlib import Path

from batch_io import read_json_files
from state import read_state
from visualization.aggregation import plot_aggregation
from visualization.clustering import plot_clustering
from visualization.embeddings import plot_embeddings
from visualization.keywords import plot_keywords
from visualization.pairings import plot_pairings
from visualization.report import build_html_index
from visualization.segmentation import plot_segmentation
from visualization.stance import plot_stance

parser = argparse.ArgumentParser()
parser.add_argument(
    "--root_dir",
    required=True,
    help="Directory of the pipeline run output",
)
args = parser.parse_args()

current_state = read_state(args.root_dir)
output_base_path = Path(f"{args.root_dir}/visualization")
output_base_path.mkdir(parents=True, exist_ok=True)

sections = []

segmenter = current_state.get("segmenter")
if segmenter:
    metas = [content for _, content in
             read_json_files(Path(segmenter["output_directory"]))]
    sections.append(
        ("Segmentation", plot_segmentation(metas, output_base_path)))
else:
    print("Skipping segmentation: no state found")

embedding_extraction = current_state.get("embedding_extraction")
if embedding_extraction:
    metas = [content for _, content in
             read_json_files(Path(embedding_extraction["output_directory"]))]
    sections.append(("Embeddings", plot_embeddings(metas, output_base_path)))
else:
    print("Skipping embeddings: no state found")

embedding_clustering = current_state.get("embedding_clustering")
if embedding_clustering:
    with open(embedding_clustering["result_path"], encoding="utf-8") as f:
        results = json.load(f)
    sections.append(("Clustering", plot_clustering(results, output_base_path)))
else:
    print("Skipping clustering: no state found")

keyword_extraction = current_state.get("keyword_extraction")
if keyword_extraction:
    cluster_metas = [content for _, content in
                     read_json_files(Path(keyword_extraction["output_directory"]))]
    with open(keyword_extraction["corpus_counts_path"], encoding="utf-8") as f:
        corpus_counts = json.load(f)
    sections.append(
        ("Keywords", plot_keywords(cluster_metas, corpus_counts, output_base_path)))
else:
    print("Skipping keywords: no state found")

keyword_pairings = current_state.get("keyword_pairings")
if keyword_pairings:
    pairing_metas = [content for _, content in
                     read_json_files(Path(keyword_pairings["output_directory"]))]
    with open(keyword_pairings["inventory_path"], encoding="utf-8") as f:
        inventory = json.load(f)["inventory"]
    sections.append(
        ("Keyword Pairings", plot_pairings(pairing_metas, inventory, output_base_path)))
else:
    print("Skipping keyword pairings: no state found")

stance_detection = current_state.get("stance_detection")
if stance_detection:
    stance_metas = [content for _, content in
                    read_json_files(Path(stance_detection["output_directory"]))]
    sections.append(
        ("Stance Detection", plot_stance(stance_metas, output_base_path)))
else:
    print("Skipping stance detection: no state found")

stance_aggregation = current_state.get("stance_aggregation")
if stance_aggregation:
    article_metas = [content for _, content in
                     read_json_files(Path(stance_aggregation["output_directory"]))]
    sections.append(
        ("Stance Aggregation", plot_aggregation(article_metas, output_base_path)))
else:
    print("Skipping stance aggregation: no state found")

index_path = build_html_index(sections, output_base_path)
print(f"Wrote visualization report to {index_path}")
