import os
import json
from pathlib import Path
import shutil
from datetime import datetime
from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_text_files

articles_path = prepare_input_dir_from_env("ARTICLES_PATH", "./assets")
passages_path = prepare_output_dir_from_env(
    "PASSAGES_PATH", "./tmp/data/passages")
passages_meta_path = prepare_output_dir_from_env(
    "PASSAGES_META_PATH", "./tmp/meta/passages")


documents = read_text_files(articles_path)

for i, doc in enumerate(documents):
    file_path, content = doc
    print(f"Processing document {i+1}/{len(documents)}: {file_path.stem}")
