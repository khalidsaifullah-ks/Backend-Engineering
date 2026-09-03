# Task API — now backed by SQLite

FlyRank Internship · Backend Track · Week 3 · Assignment A2 · JavaScript lane

Sequel to [`BE-A1-First-CRUD-API`](../BE-A1-First-CRUD-API/). Same five CRUD
endpoints, same request/response shapes — the in-memory array was replaced
with a SQLite database, so data now survives a server restart.

## Why SQLite

No server to install or run — the whole database is one file, `tasks.db`,
created automatically the first time the app starts. That's enough for a
single-process to-do API; a bigger, multi-writer service would move to
Postgres later, but the API wouldn't need to change to do it.

This project uses Node's built-in `node:sqlite` (Node 22.5+), so there's no
native module to compile.

## Install & run

```bash
cd BE-A2-Database-CRUD
npm install
npm start
```

`tasks.db` is created automatically on first run, with a `tasks` table seeded
with 3 example tasks — the seed only happens when the table is empty, so
restarting never duplicates it. `tasks.db` is git-ignored; each clone starts
fresh.

## Endpoints

Identical to A1:

| Method | Path | Success | Errors |
| --- | --- | --- | --- |
| GET | `/tasks` | 200 | — |
| GET | `/tasks/:id` | 200 | 404 unknown id |
| POST | `/tasks` | 201 | 400 missing/empty/invalid title |
| PUT | `/tasks/:id` | 200 | 400 empty/invalid body, 404 unknown id |
| DELETE | `/tasks/:id` | 204 | 404 unknown id |

Every SQL query uses `?` parameterized placeholders — no request data is ever
glued into a SQL string.

## Proof: persistence

```console
$ curl -s -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Survive restart"}'
{"id":4,"title":"Survive restart","done":false}

$ # ...stop the server, start it again...

$ curl -s http://localhost:3000/tasks
[{"id":1,...},{"id":2,...},{"id":3,...},{"id":4,"title":"Survive restart","done":false}]
```

Task 4 is still there. In A1 it would have vanished.

## One SQL query by hand

Opened `tasks.db` in DB Browser for SQLite and ran:

```sql
SELECT * FROM tasks WHERE done = 1;
```

Returned the one seeded task marked done (`Read MDN on HTTP`) — confirms the
API and the file are the same source of truth, with no syncing step.

## What changed from A1, and what didn't

Only `db.js` (new) and the storage lines inside each route handler in
`index.js` changed — `SELECT`/`INSERT`/`UPDATE`/`DELETE` instead of array
methods. Every route, every validation rule, every status code, and the
`/stats` and `/reset` extras are unchanged. That's the point: the API is the
promise, the database is where it's kept.
