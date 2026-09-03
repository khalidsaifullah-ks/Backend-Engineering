# FlyRank Internship — Backend Track

My assignments for the FlyRank internship backend track. One folder per
assignment, each self-contained with its own dependencies and README.

| Assignment | Folder | What it is | Stack |
| ---------- | ------ | ---------- | ----- |
| W2 · A1 | [`BE-A1-First-CRUD-API`](BE-A1-First-CRUD-API/) | An in-memory CRUD to-do API with Swagger UI at `/docs` | Node.js · Express |
| W3 · A2 | [`BE-A2-Database-CRUD`](BE-A2-Database-CRUD/) | Same API, storage moved to SQLite — survives restarts | Node.js · Express · SQLite |
| W7 · BE-09 | [`BE-09-AI-Decision-Flow`](BE-09-AI-Decision-Flow/) | Visual AI decision workflow — React Flow editor, Inngest execution, YES/NO branching | Next.js · React Flow · Inngest · OpenAI SDK |

Each folder installs and runs on its own, e.g.:

```bash
cd BE-A2-Database-CRUD
npm install
npm start
```

See that folder's README for endpoints, `curl -i` output and notes.
