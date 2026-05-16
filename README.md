# 📰 The Historical Knowledge Graph (Sparta Pipeline)

Transforming archival newspaper scans into an atomic knowledge graph and an immersive, first-person narrative feed.

## 🚀 Core Methodology: "The Rashomon Effect"
This project deconstructs static historical articles into multiple, first-person "status updates" from the perspectives of the people involved.

- **Knowledge Graph**: Every person, place, organization, and object is indexed as a canonical entity.
- **Atomic Facts**: Observations are extracted as verifiable triples (Subject-Predicate-Object) anchored to the source.
- **Deconstruction**: Narrative articles are broken into distinct, first-person social media updates.
- **Chronological Logic**: Fabrication of logical ISO timestamps based on article context (e.g., "last Tuesday evening").

## 🏛 Data Architecture: Source of Truth
We have moved from a single `master.json` to a multi-layered Source-of-Truth model:
- **`data/extracted/`**: The canonical truth (JSONL). Contains `pages.jsonl`, `entities.jsonl`, and `facts.jsonl`.
- **`data/generated/`**: Optimized JSON derived from the truth layer for UI performance.
- **Validation**: Strict integrity checks via `npm run validate:data` to ensure citation chains and entity resolution.

## 🛠 Tech Stack
- **Ingestion**: Bash + Node.js
- **Intelligence**: Gemini CLI (`gemini-2.0-flash`) for Vision and Text deconstruction.
- **Image Processing**: **Sharp** for high-performance WebP extraction and compression of faces, ads, and landmarks.
- **Frontend**: React (TypeScript) for the narrative viewer and graph explorer.

## 📁 Repository Structure
- `/scripts`: The core pipeline (migration, validation, and AI processing).
- `/data`: Structured storage for extracted truth and generated assets.
- `/assets`: WebP-optimized assets categorized by entity type.
- `/viewer`: The React application.
- `watchdog.sh`: Monitoring script to ensure 24/7 processing uptime.

## 🛰 How it Works
1. **Ingest**: Fetches archival PDFs and converts them to high-res images.
2. **Analyze**: Gemini CLI performs Open NER and atomic fact extraction.
3. **Anchor**: Every fact and entity is linked to a specific page ID and bounding box.
4. **Extract**: Sharp crops and compresses visual entities (people, products, buildings).
5. **Synthesize**: The AI transforms extracted facts into first-person narrative posts.
6. **Validate**: The pipeline ensures data integrity before updating the viewer.

---
*Created to preserve and index every fact of Sparta Township's history in an AI-native architecture.*
