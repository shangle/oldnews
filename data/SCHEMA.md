# 📊 oldnews Data Schema

This document defines the architecture of the archival newspaper knowledge graph.

## 🏛 1. Data Layers

### 🟢 Source Truth (Extracted)
Located in `data/extracted/`. These files use JSONL (JSON Lines) for easy appending and git-diffing.
*   **`pages.jsonl`**: Every page processed. Includes `publication`, `date`, `page_number`, `source_url`.
*   **`entities.jsonl`**: The canonical index of all nouns (People, Places, Orgs, Objects).
*   **`facts.jsonl`**: Atomic observations from the text. "X said Y", "A is at B", "Price of Z is $5".

### 🔵 Generated Assets (Derived)
Located in `data/generated/`. These are optimized for the React viewer.
*   **`feed_items.generated.json`**: The first-person narrative social feed.
*   **`people.generated.json`**: Denormalized people list for fast UI lookups.

---

## 🕒 2. Fabricated Timestamp Policy
To create a chronological feed from static newspaper dates:
1.  **Base Date**: Derived from the newspaper publication date.
2.  **Relative Offset**: If text says "Last Tuesday", the `isoDate` is calculated as the Tuesday prior to publication.
3.  **Sequential Ordering**: Multiple items from the same day are assigned sequential evening timestamps (e.g., 18:00:01, 18:00:02) to maintain article flow.

---

## ⛓ 3. Citation Chain & Confidence
Every `fact` must link to a `page_id`.
Every `feed_item` must contain `derived_from_fact_ids` or a `migration_note`.
*   **`truth_status`**: `verified` | `unverified` | `ai_generated`.

---

## 📝 4. Review Queue Rules
Items flagged for review:
- Low confidence extraction (LLM self-report).
- Conflicting facts (e.g., Person A died in 1970 but mentioned in 1977).
- Missing bounding boxes for photos.
