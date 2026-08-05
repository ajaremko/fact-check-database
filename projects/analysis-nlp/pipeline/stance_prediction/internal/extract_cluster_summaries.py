import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

MODEL_ID = "Qwen/Qwen3.5-2B"

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype="auto",
    device_map="auto"
)
tokenizer.pad_token = tokenizer.eos_token
# required for batched decoder-only generation
tokenizer.padding_side = "left"


def sample_passages(passages, embeddings, n_central=12, n_diverse=4):
    """Pick passages near the centroid (representative) plus a few far
    ones (perspective spread). embeddings: L2-normalized, one per passage."""
    if len(passages) <= n_central + n_diverse:
        return list(passages)
    centroid = embeddings.mean(axis=0)
    centroid /= np.linalg.norm(centroid)
    sims = embeddings @ centroid
    order = np.argsort(-sims)                      # nearest first
    idx = list(order[:n_central]) + list(order[-n_diverse:])
    return [passages[i] for i in idx]


SYSTEM = ("You work for a news researcher and your job is to summarize articles. "
          "Write a single concise collective abstractive summary of the texts, "
          "where individual texts are separated by |||||, and return your response "
          "as a single summary that covers the key points of the text. "
          "Do not include any text from the original passages in your summary. "
          "If you are unable to summarize the text, respond with 'Unable to summarize.'"
          "Your summary should be approximately 100 words and less than 150 words. "
          "Do not create bullet points or lists. Do not attempt to format the summary in any way. ")

MAX_INPUT_TOKENS = 6000   # leave headroom in the 8K window for chat scaffolding + output


def build_prompt(passages):
    """Join passages with the paper's separator, trimming to fit the budget."""
    joined, kept = "", []
    for p in passages:
        candidate = " ||||| ".join(kept + [p])
        if len(tokenizer.encode(candidate)) > MAX_INPUT_TOKENS:
            break
        kept.append(p)
        joined = candidate
    messages = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": joined},
    ]
    return tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False,
    )


@torch.no_grad()
def summarize_clusters(clusters, batch_size=4, max_new_tokens=160):
    """clusters: list of (passages, embeddings) tuples. Returns one summary per cluster."""
    prompts = [
        build_prompt(sample_passages(p, e)) for p, e in clusters
    ]
    summaries = []
    for i in range(0, 1, batch_size):
        batch = tokenizer(
            prompts[i:i + batch_size],
            return_tensors="pt", padding=True,
        ).to(model.device)
        out = model.generate(
            **batch,
            max_new_tokens=max_new_tokens,
            do_sample=False,                # deterministic; summaries shouldn't be creative
            temperature=None,
            top_p=None,   # silence sampling warnings under greedy
            pad_token_id=tokenizer.eos_token_id,
        )
        # slice off the prompt tokens; decode only the generated tail
        gen = out[:, batch["input_ids"].shape[1]:]
        summaries.extend(tokenizer.batch_decode(gen, skip_special_tokens=True))
    return [s.strip() for s in summaries]
