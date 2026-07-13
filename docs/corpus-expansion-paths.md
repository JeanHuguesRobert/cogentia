# Roadmap: Corpus Capacity & Knowledge Representation Expansion

A technical reference of paths to explore for increasing the capacity, maturity, and indexing capability of the Cogentia/Fractanet corpus.

---

## 1. Structured Knowledge Representation

### Method-Packet Distillation
*   **Impedance Matching**: Transform loose documentation and narrative designs into compact, structured Method Packets (e.g., following the "Seconde méthode" guidelines).
*   **Context Window De-noising**: Build a utility to distill long-form discussions into structured reference templates to prevent context bloat and improve retrieval precision.

### Knowledge Graph & Semantic Mesh
*   **Relationship Mapping**: Explicitly define links, dependencies, and visibility boundaries between corpus documents (e.g., how the digital twin public views relate to private client databases).
*   **Entity Linkage**: Build an indexing tool that links code symbols, file paths, and documentation anchors to construct a traceable semantic network of the system.

---

## 2. Dynamic Corpus Governance

### Metadata-Driven Access Control
*   **Visibility Bounds**: Establish clear visibility schemas (e.g., `public-by-default` vs. `private-by-exception`) directly in the document frontmatter.
*   **Maturity Classification**: Tag sources with maturity metrics (e.g., `draft`, `candidate`, `stable`) to dynamically tune the RAG retrieval budget.

### Grounded Action History
*   **Execution Logs**: Store verified agent tool invocations, CLI run transcripts, and user-approved plans as high-quality training and prompt context examples.
*   **Traceable Provenance**: Record the source, author, and approval chain for every corpus update, ensuring that retrieval sources can be audited.

---

## 3. Advanced Indexing Strategies

### Multi-Vector & Hybrid Search
*   **Dual-Encoder Indexing**: Implement hybrid dense/sparse vector representation using local databases (e.g., `sqlite-vec`).
*   **Dynamic Partitioning**: Segment the public corpus from private datasets to enforce architectural boundaries at the database layer.
