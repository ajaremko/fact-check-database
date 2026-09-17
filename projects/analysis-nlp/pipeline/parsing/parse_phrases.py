import argparse
import json
from pathlib import Path
from datetime import datetime
from collections import Counter
import nltk
from nltk.util import ngrams
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import networkx as nx
import pytextrank
import spacy
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from nltk.corpus import wordnet

from batch_io import read_json_files

# Download necessary data packages (only required once)
nltk.download('stopwords')
nltk.download('punkt_tab')
nltk.download('averaged_perceptron_tagger_eng')
nltk.download('wordnet')

timestamp = datetime.now()

parser = argparse.ArgumentParser()
parser.add_argument(
    "--input_dir",
    required=True,
    help="Directory of the pipeline run output",
)
args = parser.parse_args()

articles_meta_path = Path(args.input_dir)

events = read_json_files(articles_meta_path)

articles = []

for i, doc in enumerate(events[:1]):
    file_path, content = doc
    with open(content["article_path"], "r") as file:
        article_text = file.read()
        articles.append((article_text, content))

# Load spaCy English model
nlp = spacy.load("en_core_web_sm")
nlp.add_pipe("textrank")


# 2. Map standard treebank POS tags to WordNet POS tags
def get_wordnet_pos(word):
    tag = nltk.pos_tag([word])[0][1][0].upper()
    tag_dict = {"J": wordnet.ADJ, "N": wordnet.NOUN,
                "V": wordnet.VERB, "R": wordnet.ADV}
    return tag_dict.get(tag, wordnet.NOUN)


# 3. Initialize Lemmatizer and process
lemmatizer = WordNetLemmatizer()

for article_text, _ in articles:

    # Process the article text using spaCy
    doc = nlp(article_text)

    frequencies = {}

    for phrase in doc._.phrases:
        if phrase.rank > 0.035:

            # 1. Tokenize the text
            tokens = word_tokenize(phrase.text)
            nltk_lemmas = [lemmatizer.lemmatize(
                w, get_wordnet_pos(w)) for w in tokens]
            lemmatized_phrase = " ".join(nltk_lemmas)
            print(lemmatized_phrase, phrase.rank)

# output_base_path = Path(f"{args.root_dir}/passage_segmentation")

# passages_path = Path(f"{output_base_path}/passages")
# passages_path.mkdir(parents=True, exist_ok=True)

# passages_meta_path = Path(f"{output_base_path}/meta")
# passages_meta_path.mkdir(parents=True, exist_ok=True)


# events = read_json_files(articles_meta_path)

# articles = []

# for i, doc in enumerate(events):
#     file_path, content = doc
#     with open(content["article_path"], "r") as file:
#         article_text = file.read()
#         articles.append((article_text, content))

# passages_count = 0

# for article_text, content in articles:
#     segments = segment_passage(article_text)
#     for i, segment in enumerate(segments):

#         passage_id = f"{content["article_id"]}_{i+1}"
#         passage_path = passages_path / f"{passage_id}.txt"
#         with open(passage_path, "w", encoding="utf-8") as file:
#             file.write(segment)

#         passage_meta_path = passages_meta_path / f"{passage_id}.json"
#         meta_data = content | {
#             "passage_id": passage_id,
#             "passage_index": i + 1,
#             "passage_path": str(passage_path),
#             "passage_words": len(segment.split()),
#             "passage_characters": len(segment),
#         }

#         with open(passage_meta_path, "w", encoding="utf-8") as meta_file:
#             json.dump(meta_data, meta_file, indent=4)

#         passages_count += 1

# state_update = {
#     "passage_segmentation": {
#         "total_articles": len(articles),
#         "total_passages": passages_count,
#         "processed_at": timestamp.isoformat(),
#         "input_directory": str(articles_meta_path),
#         "output_directory": str(passages_meta_path),
#         "duration": (datetime.now() - timestamp).total_seconds()
#     }
# }

# current_state.update(state_update)
# write_state(args.root_dir, current_state)
