# BE-A5 — The Polite Scraper

FlyRank Internship · Backend Track · Week 5 · Assignment A9

A small, polite scraping pipeline for [Books to Scrape](https://books.toscrape.com), a public
sandbox built specifically for practising scraping. It downloads the first 3 catalogue pages,
visits all 60 book pages, and turns the HTML into clean, validated JSON — without crashing on a
broken page, and with an honest report at the end of every run.

## Target classification (Stage 0)

- **Site:** `https://books.toscrape.com` — a sandbox explicitly built so people can practise
  scraping on it (see the site's own description on `toscrape.com`).
- **Scope:** the first 3 catalogue pages only (`catalogue/page-1.html` through `page-3.html`),
  plus the 60 book detail pages linked from them.
- **Data collected:** title, product URL, price, availability, rating, description — all public,
  non-personal, already present in the server-rendered HTML.
- **robots.txt result:** requested `https://books.toscrape.com/robots.txt` once at the start of
  every run and logged the result (see a real run's `robots_check` field in
  `output/run-report.json` — the site currently returns no meaningful disallow rules for this
  path, or "no robots file found" if the request fails).
- I will not reuse this code on another site without checking its rules and terms first.

## Lane

JavaScript / Node.js 20+, using built-in `fetch`, [Cheerio](https://cheerio.js.org) for HTML
parsing, and [Zod](https://zod.dev) for schema validation.

## Install & run

```powershell
npm install
npm start
```

This produces:

- `cache/` — one saved HTML file per fetched page (gitignored, not committed)
- `output/books.json` — the validated records
- `output/errors.json` — any records/pages that failed validation or fetch, with a reason
- `output/run-report.json` — a summary of the run

Run it twice: the first run prints `FETCH` for every page; the second run prints `CACHE HIT` for
those same pages and produces the same 60 records (idempotent — no duplicates).

To prove Stage 5 (surviving a broken page), run with an injected fake URL:

```powershell
$env:INJECT_FAKE_URL="1"; npm start; Remove-Item Env:\INJECT_FAKE_URL
```

## Record schema

Each record in `output/books.json`:

```json
{
  "title": "string",
  "product_url": "absolute URL (canonical identity)",
  "price_text": "raw price string, e.g. \"£51.77\"",
  "price_gbp": "number, e.g. 51.77",
  "availability_text": "raw availability string",
  "rating_text": "string or null, e.g. \"Three\"",
  "rating": "number 1-5 or null",
  "description": "string or null (null when the book has no description)",
  "source_page": "absolute URL of the catalogue page it was discovered on",
  "fetched_at": "ISO 8601 timestamp"
}
```

Records failing schema validation go to `output/errors.json` with a reason and never reach
`books.json`.

## Politeness rules

- **User-agent:** every real request sends `FlyRankInternshipA9/1.0 (+link-to-repo)`.
- **Timeout:** every request aborts after 8 seconds.
- **Delay:** at least 500ms before every real network request (cached reads skip the delay).
- **Status check:** only `200` is treated as a usable page. `404`/`403` are never retried; `5xx`
  or timeouts get one retry.
- **Cache:** every fetched page is saved under `cache/` and reused on subsequent runs, so the
  live site is only hit once per unique page.

## Sample run report (real, from an actual run)

First run (cold cache):

```json
{
  "start_time": "2026-09-03T15:53:08.204Z",
  "duration_ms": 56887,
  "catalogue_pages": 3,
  "discovered_urls": 60,
  "unique_urls": 60,
  "pages_fetched": 64,
  "cache_hits": 1,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0,
  "robots_check": "no robots file found"
}
```

Rerun (warm cache, same 60 records, no duplicates):

```json
{
  "start_time": "2026-09-03T15:54:48.528Z",
  "duration_ms": 1921,
  "catalogue_pages": 3,
  "discovered_urls": 60,
  "unique_urls": 60,
  "pages_fetched": 1,
  "cache_hits": 64,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0,
  "robots_check": "no robots file found"
}
```

With `INJECT_FAKE_URL=1` (one deliberately broken URL added on purpose):

```json
{
  "start_time": "2026-09-03T15:54:59.590Z",
  "duration_ms": 2921,
  "catalogue_pages": 3,
  "discovered_urls": 61,
  "unique_urls": 61,
  "pages_fetched": 2,
  "cache_hits": 64,
  "valid_records": 60,
  "invalid_records": 1,
  "failed_pages": 1,
  "robots_check": "no robots file found"
}
```

The run still finished, `books.json` still has the 60 good records, and `failed_pages: 1` proves
the broken page was logged and skipped instead of crashing the run.

## Why no browser was needed

The book data (title, price, availability, rating, description) is already present in the raw
HTML the server sends for both the catalogue and detail pages — no JavaScript rendering is
required to reveal it. A headless browser would only add startup cost and memory overhead with
no benefit here.

## Ethics note

Use an official API when one exists instead of scraping. Never bypass logins, paywalls, or
explicit blocks. Collect only the fields needed for the task, and identify the scraper honestly
via its user-agent so a site owner can always tell who is visiting and why.

## Known limitation

The retry logic is a single, simple retry on timeouts/5xx with no exponential backoff or
`Retry-After` handling — that upgrade is deliberately left for next week's assignment (A16), per
the brief's guidance not to gold-plate Stage 5.
