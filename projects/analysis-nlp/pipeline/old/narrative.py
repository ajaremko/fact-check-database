import time
import spacy
import networkx as nx
import itertools


def pairwise(iterable):
    a, b = itertools.tee(iterable)
    next(b, None)
    return zip(a, b)


# Load the small English model
nlp = spacy.load("en_core_web_sm")


def split_into_clauses(text):
    doc = nlp(text)
    clauses = []

    # Identify verbs that serve as the heads of clauses
    clause_heads = []
    for token in doc:
        # Check if the token is a verb and has a clause-level dependency tag
        if token.pos_ in ["VERB", "AUX"]:
            if token.dep_ in ["ROOT", "ccomp", "xcomp", "advcl", "relcl", "conj"]:
                clause_heads.append(token)

    # Sort heads by their position in the text
    clause_heads.sort(key=lambda x: x.i)

    # Extract spans for each clause based on the verb subtrees
    for head in clause_heads:
        # Get all tokens belonging to this verb's dependency subtree
        subtree = list(head.subtree)
        start = subtree[0].i
        end = subtree[-1].i + 1

        # Slice the doc to get the full clause text
        clause_text = doc[start:end].text
        clauses.append(clause_text)

    return clauses


def analyze_narrative(text):
    # Start the timer
    start_time = time.perf_counter()

    # Process your text
    doc = nlp(text)

    # 1. Initialize an empty graph
    G = nx.Graph()

    def getId(token):
        if "subj" in token.dep_:
            return f"Subject: {token.text}"
        elif "obj" in token.dep_:
            return f"Object: {token.text}"
        return f"{token.i}:{token.text:<10}"

    for sentence in doc.sents:
        sent = nlp(sentence.text)
        print(f"\nSentence: {sent.text}")
        # Extract and print POS tags
        for token1, token2 in pairwise(sent):
            token = token1
            tokenId = getId(token)
            G.add_node(tokenId)
            if token2:
                nextId = getId(token2)
                G.add_edge(tokenId, nextId)

        for ent in sent.ents:
            print(f"Entity: {ent.text:15} | Label: {ent.label_}")

    # End the timer
    end_time = time.perf_counter()

    # Calculate duration
    execution_time = end_time - start_time
    print(f"Function completed in {execution_time:.4f} seconds")

    return G
