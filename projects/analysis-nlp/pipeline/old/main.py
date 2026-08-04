import csv
from transformers import pipeline
from sentence_transformers import SentenceTransformer
import umap
import hdbscan
import numpy as np
from pathlib import Path
from BertWithPOSEmbeddings import extract_embeddings
from cluster import umap_reduce
from narrative import analyze_narrative, split_into_clauses

import networkx as nx
import matplotlib.pyplot as plt


# 1. Sample text data
documents = []

print(Path.cwd())  # Print the current working directory

# Define the folder path
folder_path = Path("./assets")

# Loop through all items in the folder
for file_path in folder_path.iterdir():
    if file_path.is_file():  # Make sure it's a file, not a subfolder
        print(f"Reading: {file_path.name}")

        # Open and read the file content
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
            documents.append(content)  # Add the content to the documents list

clauses = split_into_clauses(documents[0])

# Open the file in write mode ('w')
with open('output.csv', 'w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)

    writer.writerow(['Clause'])  # Adjusted header for clauses

    # Write all data rows at once
    writer.writerows([[clause] for clause in clauses])

# G = analyze_narrative(
#     documents[0]
# )

# # 4. Define the structural layout (Spring layout positions nodes organically)
# pos = nx.spring_layout(G, seed=42)

# # 5. Customize the graph appearance
# nx.draw(
#     G, pos,
#     with_labels=True,      # Show node names
#     node_color="skyblue",  # Node background color
#     node_size=200,         # Size of nodes
#     font_size=6,          # Text size
#     font_weight="bold",    # Text emphasis
#     edge_color="gray",     # Connection line color
#     width=2                # Line thickness
# )

# # 6. Display the static plot
# plt.savefig('my_plot.png', bbox_inches='tight')

# ner_pipeline = pipeline("ner", model="dslim/bert-base-NER",
#                         aggregation_strategy="simple")

# # 3. Execute inference
# for text in documents:
#     results = ner_pipeline(text)
#     # Print the first 100 characters of the text
#     print(f"\nText: {text[:80]}...")
#     for entity in results:
#         if (entity['score'] > 0.9):  # Filter entities with a confidence score above 0.85
#             print(
#                 f"Entity: {entity['word']} | Label: {entity['entity_group']} | Score: {entity['score']:.4f}")

# # 2. Extract BERT embeddings
# # 'all-MiniLM-L6-v2' is a fast, high-quality BERT-based model
# embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
# embeddings = embedding_model.encode(documents)
# embeddings = [extract_embeddings(doc) for doc in documents]

# cluster_labels, reduced_embeddings = umap_reduce(embeddings)

# # 5. Output results
# for doc, label in zip(documents, cluster_labels):
#     # Print the first sentence of each document with its cluster label
#     print(f"Cluster {label}: {doc.split('.')[0]}")
