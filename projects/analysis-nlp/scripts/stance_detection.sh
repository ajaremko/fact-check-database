export NLTK_DISABLE_IMPORT_SECURITY=1 
export ROOT_DIR=tmp/stance_detection_run_ccnews_med_agglomerative
export INPUT_DIR=tmp/ccnews_data/year=2018/take=10000/timestamp=2026-08-07_19:16:51/meta
uv run pipeline/stance_prediction/initialize_pipeline.py --input_dir=$INPUT_DIR --root_dir=$ROOT_DIR \
&& uv run pipeline/stance_prediction/segment_passages.py --root_dir=$ROOT_DIR \
&& uv run pipeline/stance_prediction/extract_embeddings.py --root_dir=$ROOT_DIR \
&& uv run pipeline/stance_prediction/cluster_embeddings.py --root_dir=$ROOT_DIR --clustering_strategy=agglomerative \
&& uv run pipeline/stance_prediction/extract_keywords.py --root_dir=$ROOT_DIR \
&& uv run pipeline/stance_prediction/build_keyword_pairings.py --root_dir=$ROOT_DIR \
&& uv run pipeline/stance_prediction/predict_stance.py --root_dir=$ROOT_DIR \
&& uv run pipeline/stance_prediction/aggregate_stances.py --root_dir=$ROOT_DIR \
&& uv run pipeline/stance_prediction/visualize_pipeline.py --root_dir=$ROOT_DIR