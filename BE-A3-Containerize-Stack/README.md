# Task API — Containerized (FlyRank W1/A3)

The A1/A2 task CRUD API, now running against a real PostgreSQL database in
Docker. Same routes, same behaviour — only the storage engine changed again.

## Run everything

```bash
cp .env.example .env
docker compose up
```

That's it — `api` (this app) and `db` (Postgres) both start, the `tasks`
table is created automatically, and three example tasks are seeded on first
run. The API is at `http://localhost:3000`.

To stop: `docker compose down` (add `-v` only if you want to wipe the data
volume too).

## Standalone Postgres (Stage 0, for reference)

```bash
docker run --name taskdb -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=tasks \
  -p 5432:5432 -v taskdata:/var/lib/postgresql/data -d postgres
```

## Environment variables

See `.env.example`. Only one variable is needed:

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string, e.g. `postgres://postgres:dev@localhost:5432/tasks` |

## Endpoints

| Method | Path | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/tasks` | List all tasks | 200 | — |
| GET | `/tasks/:id` | Get one task | 200 | 404 |
| POST | `/tasks` | Create a task | 201 | 400 |
| PUT | `/tasks/:id` | Update a task | 200 | 400, 404 |
| DELETE | `/tasks/:id` | Delete a task | 204 | 404 |
| GET | `/health` | Health check (pings the DB) | 200 | — |

## Example

```bash
curl -i http://localhost:3000/tasks
```

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

[
  {"id":1,"title":"Read MDN on HTTP","done":true},
  {"id":2,"title":"Build the CRUD API","done":false},
  {"id":3,"title":"Push it to GitHub","done":false}
]
```

## Persistence

Data lives in the `taskdata` named volume. Run `docker compose down` then
`docker compose up` again — the tasks are still there.
