import nltk
from nltk.corpus import names

nltk.download("names")

# ~8K common English first names
FIRST_NAMES = {n.lower() for n in names.words()}


def filter_first_names(keywords):
    return [w for w in keywords if w not in FIRST_NAMES]
