// FlyRank Internship - Backend Track - W5 - A9: The polite scraper
// Target: https://books.toscrape.com (a public practice sandbox)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, "cache");
const OUTPUT_DIR = path.join(ROOT, "output");

const BASE_URL = "https://books.toscrape.com/";
const USER_AGENT = "FlyRankInternshipA9/1.0 (+https://github.com/example/flyrank-internship)";
const TIMEOUT_MS = 8000;
const DELAY_MS = 550;
const MAX_RETRIES = 1; // one extra attempt on timeout/5xx

// Set to true to inject one deliberately broken URL to prove Stage 5 resilience.
const INJECT_FAKE_URL = process.env.INJECT_FAKE_URL === "1";

function log(...args) {
  console.log(...args);
}

async function ensureDirs() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheFileFor(url) {
  const safe = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 150);
  return path.join(CACHE_DIR, `${safe}.html`);
}

/**
 * Fetch a URL politely: identifying user-agent, timeout, status check, on-disk cache,
 * and a delay before real network requests. Retries once on timeout/5xx, never on 404/403.
 * Returns { html, fromCache, status }.
 */
async function politeFetch(url, { stats }) {
  const cacheFile = cacheFileFor(url);

  try {
    const cached = await fs.readFile(cacheFile, "utf-8");
    stats.cacheHits += 1;
    log(`CACHE HIT ${url} (${cached.length} bytes)`);
    return { html: cached, fromCache: true, status: 200 };
  } catch {
    // not cached yet, fall through to a real fetch
  }

  let attempt = 0;
  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      await sleep(DELAY_MS); // be a polite guest before every real request
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timer);
      stats.pagesFetched += 1;

      if (res.status === 200) {
        const html = await res.text();
        await fs.writeFile(cacheFile, html, "utf-8");
        log(`FETCH ${url} -> 200 (${html.length} bytes)`);
        return { html, fromCache: false, status: 200 };
      }

      // 404: page does not exist, asking again will not create it.
      // 403: site said no, asking again is how a polite robot becomes a pest.
      if (res.status === 404 || res.status === 403) {
        log(`FAILED ${url} -> ${res.status} (no retry)`);
        return { html: null, fromCache: false, status: res.status };
      }

      if (res.status >= 500 && attempt <= MAX_RETRIES + 1) {
        log(`FAILED ${url} -> ${res.status} (will retry)`);
        continue;
      }

      log(`FAILED ${url} -> ${res.status}`);
      return { html: null, fromCache: false, status: res.status };
    } catch (err) {
      clearTimeout(timer);
      if (attempt <= MAX_RETRIES + 1) {
        log(`FAILED ${url} -> ${err.name || "error"} (will retry)`);
        continue;
      }
      log(`FAILED ${url} -> ${err.name || "error"} (giving up)`);
      return { html: null, fromCache: false, status: 0 };
    }
  }
}

async function checkRobots(stats) {
  const url = new URL("robots.txt", BASE_URL).toString();
  const { html, status } = await politeFetch(url, { stats });
  if (status === 200 && html) {
    return html.trim() || "empty robots file";
  }
  return "no robots file found";
}

/** Stage 2: discover all book links across the 3 catalogue pages, following "next". */
async function discoverBookUrls(stats) {
  const urls = new Set();
  let pageUrl = new URL("catalogue/page-1.html", BASE_URL).toString();
  let pagesVisited = 0;

  while (pageUrl && pagesVisited < 3) {
    const { html, status } = await politeFetch(pageUrl, { stats });
    if (status !== 200 || !html) break;
    pagesVisited += 1;

    const $ = cheerio.load(html);
    $("article.product_pod h3 a").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const absolute = new URL(href, pageUrl).toString();
        urls.add(absolute);
      }
    });

    const nextHref = $("li.next a").attr("href");
    pageUrl = nextHref && pagesVisited < 3 ? new URL(nextHref, pageUrl).toString() : null;
  }

  const list = Array.from(urls);
  if (INJECT_FAKE_URL) {
    list.push(new URL("catalogue/this-book-does-not-exist_00000/index.html", BASE_URL).toString());
  }

  return { urls: list, pagesVisited };
}

const RATING_WORDS = { One: 1, Two: 2, Three: 3, Four: 4, Five: 5 };

/** Stage 3: extract the eight raw fields from one book detail page. */
function extractRecord($, url, sourcePage) {
  const title = $(".product_main h1").first().text().trim() || null;
  const priceText = $(".product_main .price_color").first().text().trim() || null;
  const availabilityText = $(".product_main .availability").first().text().trim() || null;
  const ratingClass = $(".product_main .star-rating").attr("class") || "";
  const ratingWord = ratingClass.split(" ").find((c) => c in RATING_WORDS) || null;
  const description = $("#product_description").length
    ? $("#product_description").next("p").text().trim() || null
    : null;

  return {
    title,
    product_url: url,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingWord,
    description,
    source_page: sourcePage,
    fetched_at: new Date().toISOString(),
  };
}

/** Stage 4: turn a raw record into a normalized one, ready for schema validation. */
function normalizeRecord(raw) {
  const priceMatch = raw.price_text ? raw.price_text.match(/[\d.]+/) : null;
  const price_gbp = priceMatch ? Number.parseFloat(priceMatch[0]) : null;
  const rating = raw.rating_text ? RATING_WORDS[raw.rating_text] ?? null : null;

  return {
    ...raw,
    price_gbp,
    rating,
  };
}

const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_text: z.string(),
  price_gbp: z.number().positive(),
  availability_text: z.string(),
  rating_text: z.string().nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string(),
});

async function run() {
  const startedAt = Date.now();
  const stats = { pagesFetched: 0, cacheHits: 0 };
  await ensureDirs();

  const robotsResult = await checkRobots(stats);
  log(`robots.txt check: ${robotsResult.split("\n")[0]}`);

  const { urls, pagesVisited } = await discoverBookUrls(stats);
  const uniqueUrls = Array.from(new Set(urls));
  log(`catalogue_pages=${pagesVisited} discovered=${urls.length} unique_urls=${uniqueUrls.length}`);

  const validRecords = [];
  const errors = [];
  const seenCanonical = new Set();
  let failedPages = 0;

  for (const url of uniqueUrls) {
    const { html, status } = await politeFetch(url, { stats });
    if (status !== 200 || !html) {
      failedPages += 1;
      errors.push({ url, reason: `fetch failed with status ${status}` });
      continue;
    }

    const $ = cheerio.load(html);
    const sourcePage = new URL("catalogue/page-1.html", BASE_URL).toString();
    const raw = extractRecord($, url, sourcePage);
    const normalized = normalizeRecord(raw);

    const parsed = BookSchema.safeParse(normalized);
    if (!parsed.success) {
      errors.push({ url, reason: parsed.error.issues.map((i) => i.message).join("; ") });
      continue;
    }

    if (seenCanonical.has(parsed.data.product_url)) {
      continue; // idempotent: same canonical URL, do not duplicate
    }
    seenCanonical.add(parsed.data.product_url);
    validRecords.push(parsed.data);
  }

  if (uniqueUrls.length > 0) {
    const firstUrl = uniqueUrls[0];
    const { html } = await politeFetch(firstUrl, { stats });
    if (html) {
      log("Sample raw+normalized record:");
      log(JSON.stringify(validRecords[0] ?? {}, null, 2));
    }
  }

  await fs.writeFile(
    path.join(OUTPUT_DIR, "books.json"),
    JSON.stringify(validRecords, null, 2),
    "utf-8"
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, "errors.json"),
    JSON.stringify(errors, null, 2),
    "utf-8"
  );

  const report = {
    start_time: new Date(startedAt).toISOString(),
    duration_ms: Date.now() - startedAt,
    catalogue_pages: pagesVisited,
    discovered_urls: urls.length,
    unique_urls: uniqueUrls.length,
    pages_fetched: stats.pagesFetched,
    cache_hits: stats.cacheHits,
    valid_records: validRecords.length,
    invalid_records: errors.length,
    failed_pages: failedPages,
    robots_check: robotsResult.split("\n")[0],
  };
  await fs.writeFile(
    path.join(OUTPUT_DIR, "run-report.json"),
    JSON.stringify(report, null, 2),
    "utf-8"
  );

  log("detail_pages=" + uniqueUrls.length);
  log("RUN REPORT:", JSON.stringify(report, null, 2));
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
});
