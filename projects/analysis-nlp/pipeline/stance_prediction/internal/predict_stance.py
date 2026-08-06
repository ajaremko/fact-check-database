import json

import torch
from transformers import pipeline

MODEL_ID = "MoritzLaurer/deberta-v3-xsmall-zeroshot-v1.1-all-33"
HYPOTHESIS_TEMPLATE = "This text is {}."

classifier = pipeline(
    "zero-shot-classification",
    model=MODEL_ID,
    device=0 if torch.cuda.is_available() else -1,
)


def load_passage_from_meta(meta_path):
    """meta_path: path to a passage's metadata JSON (carries article_id
    and the passage's own text file path). Returns (article_id, text)."""
    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    with open(meta["passage_path"], encoding="utf-8") as f:
        passage_text = f.read()
    return meta["article_id"], passage_text


def predict_stances(passages, targets, batch_size=32):
    """passages: list[str] (one cluster's passages).
    targets: list[str] (that cluster's target keywords).
    Returns one record per (passage, target) pair."""
    results = []
    for target in targets:
        candidate_labels = [
            f"in favor of {target}",
            f"against {target}",
            f"neutral about {target}",
        ]
        label_to_stance = dict(zip(
            candidate_labels, ["pro", "against", "neutral"], strict=True
        ))
        outputs = classifier(
            passages,
            candidate_labels,
            hypothesis_template=HYPOTHESIS_TEMPLATE,
            batch_size=batch_size,
        )
        for i, out in enumerate(outputs):
            scores = {
                label_to_stance[label]: score
                for label, score in zip(out["labels"], out["scores"], strict=True)
            }
            results.append({
                "passage_index": i,
                "target": target,
                "label": max(scores, key=scores.get),
                "scores": scores,
            })
    return results
