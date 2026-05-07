# 📰 The Historical Feed (Sparta Pipeline)

Transforming archival newspaper scans into an immersive, chronological "social media" feed.

## 🚀 Core Methodology: "The Rashomon Effect"
This project deconstructs static historical articles into multiple, first-person "status updates" from the perspectives of the people involved.

- **Deconstruction**: Articles are broken into 5-7 distinct posts.
- **Perspective**: Third-person reporting is converted into first-person updates.
- **Quotes**: Every direct quote becomes a standalone post by the person who said it.
- **Chronological Logic**: Fabrication of exact ISO timestamps based on the article's context (e.g., "last Thursday evening").

## 🛠 Tech Stack
- **Ingestion**: Bash + Node.js
- **Intelligence**: Gemini CLI (`gemini-2.0-flash`) for Vision and Text deconstruction.
- **Image Processing**: ImageMagick for automated spatial detection and portrait cropping.
- **Frontend**: React (TypeScript) with a custom CSS "Premium Gradient" avatar system.

## 📁 Repository Structure
- `/scripts`: The core automation pipeline (prompt preparation, JSON processing).
- `/data`: `master.json` - The normalized knowledge graph of Sparta history.
- `/assets`: Cropped portraits and original archival assets.
- `/viewer`: The React application that renders the social feed.
- `batch-process.sh`: Script to loop through a directory of archival PDFs.
- `run-pipeline.sh`: The main orchestrator for a single document.

## 🛰 How it Works
1. **Download**: Fetches archival PDFs from `spartahistory.org`.
2. **Vision Analysis**: Gemini CLI analyzes the page for text and spatial coordinates of portraits.
3. **Deconstruction**: The AI generates a relational JSON of posts, ads, and people.
4. **Cropping**: ImageMagick crops faces out of the high-res scan using AI coordinates.
5. **Merge**: Data is merged into the master database while resolving duplicate entities.
6. **Deploy**: The React viewer builds a chronological timeline.

---
*Created to preserve and increase the visibility of Sparta Township's history in an AI-powered world.*
