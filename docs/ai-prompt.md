# Stage 7 — the prompt I wrote

## Attempt 1 (written from memory, no copy-paste from the assignment)

> Build me a small REST API for a to-do list in JavaScript, using Node.js and
> the Express framework. Keep it in one file and don't use a database — the
> tasks live in an array in memory.
>
> A task looks like this: `{ "id": 1, "title": "Buy milk", "done": false }`.
> Start with three example tasks already in the array.
>
> I want these endpoints:
>
> - `GET /tasks` — return the whole list
> - `GET /tasks/:id` — return one task, or 404 if that id doesn't exist
> - `POST /tasks` — create a task from a JSON body with a `title`. The server
>   picks the id and sets `done` to false. Respond 201 with the new task.
> - `PUT /tasks/:id` — change a task's title and/or done, respond with the
>   updated task, 404 if the id doesn't exist
> - `DELETE /tasks/:id` — remove the task, respond 204 with no body, 404 if the
>   id doesn't exist
>
> Validation: if `title` is missing or empty on POST, respond 400 with a JSON
> body like `{ "error": "..." }`. Same for an invalid PUT body. Every error
> response must be JSON, never HTML.
>
> Also serve Swagger UI at `/docs` using swagger-ui-express so I can click
> "Try it out" on every endpoint.
>
> Run on port 4000.

## Attempt 2 (the one rematch, after reviewing attempt 1)

Everything above, plus the four things attempt 1 got wrong or silently decided
for me:

> Additional requirements:
>
> - `PUT` must be a **partial** update: if I send only `{ "done": true }`, the
>   title must stay as it was. If I send an empty object `{}`, respond 400.
> - Reject wrong types too, not just missing fields: `{ "title": 123 }` and
>   `{ "done": "yes" }` must both be 400, not accepted.
> - Trim whitespace from the title, and treat `"   "` as empty (400).
> - Add a catch-all so that an unknown path returns a **JSON** 404, and a body
>   that isn't parseable JSON returns a **JSON** 400 — Express' default HTML
>   error page is not acceptable.
> - Ids must never be reused: deleting the newest task and creating another one
>   must not hand out the same id twice. Don't derive the next id from
>   `array.length` or from the current maximum.
