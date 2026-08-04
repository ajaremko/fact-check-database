import math
from collections import Counter, defaultdict
import spacy

nlp = spacy.load("en_core_web_sm")
EXCLUDED_ENTS = {"FAC", "LOC", "WORK_OF_ART", "DATE", "TIME",
                 "PERCENT", "MONEY", "QUANTITY", "ORDINAL", "CARDINAL"}


def cluster_keywords(passages_by_cluster, top_k=10, alpha=1.0):
    """passages_by_cluster: dict[cluster_id, list[str]] (exclude label -1)."""
    cluster_counts, corpus_counts = {}, Counter()
    cluster_totals, total = {}, 0

    for cid, passages in passages_by_cluster.items():
        counts = Counter()
        for doc in nlp.pipe(passages):
            for tok in doc:
                if tok.is_alpha and not tok.is_stop and tok.pos_ in ("NOUN", "PROPN"):
                    if tok.ent_type_ in EXCLUDED_ENTS:
                        continue
                    counts[tok.lemma_.lower()] += 1
        cluster_counts[cid] = counts
        corpus_counts.update(counts)
        cluster_totals[cid] = sum(counts.values())
        total += cluster_totals[cid]

    keywords = {}
    for cid, counts in cluster_counts.items():
        p_c = cluster_totals[cid] / total
        scored = []
        for w, c in counts.items():
            p_w = corpus_counts[w] / total
            p_wc = (c + alpha) / total        # α-smoothed joint count
            scored.append((math.log2(p_wc / (p_w * p_c)), w))
        keywords[cid] = [w for _, w in sorted(scored, reverse=True)[:top_k]]
    return keywords


passages = [
    "The quick brown fox jumps over the lazy dog.",
    "A fast, dark-colored fox leaps above a sleepy canine.",
    "The sly fox swiftly jumps over the lethargic dog.",
    "A cunning fox vaults over the drowsy dog.",
    "The clever fox hops over the sluggish dog.",
    "Bats are nocturnal mammals capable of sustained flight, and they play a crucial role in ecosystems as pollinators and insect controllers.",
    "Bats are fascinating creatures that navigate the night sky using echolocation, emitting high-frequency sounds to locate prey and avoid obstacles.",
    "Bats are the only mammals capable of true flight, and they have a diverse diet that includes insects, fruits, and nectar, making them essential for maintaining ecological balance.",
    "Bats are highly adaptable animals that can be found in various habitats worldwide, from caves and forests to urban environments, and they contribute to the control of insect populations and the pollination of plants.",
    "Bats are remarkable creatures that have evolved unique adaptations for flight, echolocation, and social behavior.",
    "Animals like bats are vital for the health of ecosystems, as they help control insect populations and facilitate the reproduction of many plant species through pollination.",
    "Elephants are large, intelligent mammals known for their long trunks, tusks, and social behavior. They are native to Africa and Asia and play a crucial role in their ecosystems by shaping landscapes and dispersing seeds.",
    "Cobras are venomous snakes known for their hooded appearance and potent neurotoxic venom. They are found in various regions, including Africa and Asia, and are often feared due to their dangerous bite.",
    "Cheetahs are the fastest land animals, capable of reaching speeds up to 60 to 70 miles per hour. They are native to Africa and are known for their distinctive spotted coats",
    "A cat catches a mouse in the barn.",
    "Mice are often eaten by eagles, snakes, and other predators in the wild.",
    "The cat is a small, domesticated carnivorous mammal with soft fur.",
]

clusters = cluster_keywords(
    {0: passages[:5], 1: passages[5:11], 2: passages[11:]}, top_k=5, alpha=1.0)
print(clusters)
