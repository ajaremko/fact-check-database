import os
import json
from pathlib import Path
import shutil
from datetime import datetime
from batch_io import prepare_output_dir_from_env, prepare_input_dir_from_env, read_json_files
import re
from nltk.tokenize import TextTilingTokenizer
import pysbd

seg = pysbd.Segmenter(language="en", clean=False)
tt = TextTilingTokenizer(w=10, k=5)


def hard_split(sentence, max_words):
    """Last resort for a single sentence > max_words:
    split on clause punctuation, then raw word slices."""
    clauses = re.split(r'(?<=[;:,\u2014])\s+', sentence)
    out, cur, n = [], [], 0
    for c in clauses:
        cn = len(c.split())
        if cn > max_words:                      # even a clause is too long
            words = c.split()
            out.extend(' '.join(words[i:i+max_words])
                       for i in range(0, len(words), max_words))
            continue
        if n + cn > max_words and cur:
            out.append(' '.join(cur))
            cur, n = [], 0
        cur.append(c)
        n += cn
    if cur:
        out.append(' '.join(cur))
    return out


def pack_tile(tile, max_words=100):
    passages, cur, n = [], [], 0
    for sent in seg.segment(tile.strip()):
        sn = len(sent.split())
        if sn > max_words:                      # pathological sentence
            if cur:
                passages.append(' '.join(cur))
                cur, n = [], 0
            passages.extend(hard_split(sent, max_words))
            continue
        if n + sn > max_words and cur:
            passages.append(' '.join(cur))
            cur, n = [], 0
        cur.append(sent)
        n += sn
    if cur:
        passages.append(' '.join(cur))
    return passages


def segment_article(text, max_words=100):
    try:
        tiles = tt.tokenize(text)               # needs \n\n breaks
    except (ValueError, ZeroDivisionError):     # too short for TextTiling
        tiles = [text]
    return [p for tile in tiles for p in pack_tile(tile, max_words)]


articles_meta_path = prepare_input_dir_from_env(
    "ARTICLES_META_PATH", "./tmp/meta/articles")
passages_path = prepare_output_dir_from_env(
    "PASSAGES_PATH", "./tmp/data/passages")
passages_meta_path = prepare_output_dir_from_env(
    "PASSAGES_META_PATH", "./tmp/meta/passages")


events = read_json_files(articles_meta_path)

articles = []

for i, doc in enumerate(events):
    file_path, content = doc
    with open(content["article_path"], "r") as file:
        article_text = file.read()
        articles.append((article_text, content))

for article_text, content in articles:
    segments = segment_article(article_text)
    for i, segment in enumerate(segments):

        passage_id = f"{content["article_id"]}_{i+1}"
        passage_path = passages_path / f"{passage_id}.txt"
        with open(passage_path, "w", encoding="utf-8") as file:
            file.write(segment)

        passage_meta_path = passages_meta_path / f"{passage_id}.json"
        with open(passage_meta_path, "w", encoding="utf-8") as meta_file:
            meta_data = {
                "source": content["source"],
                "processed_at": datetime.now().isoformat(),
                "article_id": content["article_id"],
                "article_words": content["article_words"],
                "article_characters": content["article_characters"],
                "article_path": content["article_path"],
                "passage_id": passage_id,
                "passage_path": str(passage_path),
                "passage_words": len(segment.split()),
                "passage_characters": len(segment),
            }
            json.dump(meta_data, meta_file, indent=4)
