import re
from nltk.tokenize import TextTilingTokenizer
import pysbd
import nltk

nltk.download('stopwords')
tt = TextTilingTokenizer(w=10, k=5)
seg = pysbd.Segmenter(language="en", clean=False)


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


def segment_passage(text, max_words=100):
    try:
        tiles = tt.tokenize(text)               # needs \n\n breaks
    except (ValueError, ZeroDivisionError):     # too short for TextTiling
        tiles = [text]
    return [p for tile in tiles for p in pack_tile(tile, max_words)]
