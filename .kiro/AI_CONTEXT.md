# AI Context for RxDx

This document serves as the "System Prompt" and contextual baseline for AI assistants working on the RxDx project. It encapsulates the core architecture, data model complexities, and strict coding guidelines required for this compliance-focused project.

## 1. The Core Philosophy
RxDx is a Requirement Management System built for regulated environments (medical devices, automotive, etc.). It prioritizes:
1. **End-to-End Traceability**: Every piece of data (Requirement, Task, Test, Risk) is linked in a Knowledge Graph.
2. **Immutable Audit Trails**: Digital signatures and version histories must never be destroyed.
3. **Dual Interface**: Users can view the system through a standard web interface (2D react-flow, tables) and an immersive 3D/VR interface (react-three-fiber). **Priority for Release 0.0.1 is exclusively the 2D WebUI. 3D/VR development is paused until the backend and 2D UI are stable.**
4. **Data Sovereignty**: Local LLM integration only. No external services.

## 2. Architecture & Tech Stack Rules

### Backend (FastAPI + Python 3.11+)
- **Dependency Management**: ALWAYS use `uv` (`uv run`, `uv sync`). Do not use `pip`, `python`, or `poetry` directly.
- **Dual Database Pattern**:
  - **Relational (PostgreSQL/SQLAlchemyAsync)**: Use this ONLY for ACID-compliant strict data (Users, Authentication, Digital Signatures, Audit Logs).
  - **Graph (Apache AGE via Cypher queries)**: Use this for the Project Knowledge Graph (WorkItems, Requirements, Tasks, Tests, Risks, Documents, and all Traceability edges).
- **Validation**: Use Pydantic v2 exclusively.

### Frontend (React 18+ + TypeScript)
- **State Management**: Use `Zustand` (`frontend/src/stores/`). State is split logically (`graphStore` for 2D/3D synchronization and layout, `workitemStore` for CRUD and tabular views).
- **Graph Views**: 
  - `graphStore` maintains position mappings between 2D (x,y) and 3D (x,y,z) coordinate systems.
  - Modifying graph data MUST go through `graphService` and reflect in both views.
- **Styling**: `shadcn/ui` + standard Web UI practices.

### Infrastructure & Deployment
- Everything is containerized. Standard deployment uses `docker compose up -d`.
- **Scripts**: Leverage the existing `scripts/` (e.g., `seed_data.py` with templates rather than bare `.sql` seeds).

## 3. Data Model Constraints 
1. **WorkItems**: A WorkItem is a node in the graph. Its `type` dictates its role (`requirement`, `task`, `test`, `risk`, `document`).
2. **Traceability (Edges)**:
   - `IMPLEMENTS`: Task -> Requirement
   - `TESTED_BY`: Requirement -> Test
   - `MITIGATES`: Requirement -> Risk
   - `DEPENDS_ON`: Node -> Node
   - `NEXT_VERSION`: Links a WorkItem to its previous immutable version.

## 4. Development Workflow & Guidelines
1. **Never Destroy History**: When updating a WorkItem, you are generally creating a new version (`NEXT_VERSION` edge) and invalidating the digital signature of the prior version.
2. **Handle Large Graphs**: The Graph view limits queries to 1000 nodes for performance. Respect this pagination/depth limit in backend services.
3. **Update the Traceability Matrix**: If you add a new entity or relationship type, ensure it adheres to the traceability matrix guidelines in `design.md`.

## 5. Current Focus (Release 0.0.1 Roadmap)
The immediate focus involves structural improvements:
- Introducing strict Phase progression (`next` links).
- Formalizing Requirements chains: `User Need (UN) -> Design Input (DIR) -> Design Output (DOR) -> Process Requirement (PR) -> Work Instruction Requirement (WIR)`.
- Reworking Graph/Table views and implementing the PSP (Project Structure Plan) Table.
