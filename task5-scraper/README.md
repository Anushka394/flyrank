# task5-scraper

A polite scraping pipeline that collects 60 books from Books to Scrape, turns messy HTML into clean, schema-checked JSON, and survives a broken page without crashing.

## Target Classification

* **Site:** books.toscrape.com
* **Why:** It's explicitly built as a scraping practice sandbox — the parent site (toscrape.com) describes it as "a fictional bookstore that desperately wants to be scraped... a safe place for beginners learning web scraping." Pages on the site also show a "Warning! This is a demo website for web scraping purposes" banner.
* **Scope:** Only the first 3 catalogue pages (60 books total), nothing more.
* **Data collected:** Book title, price, availability, rating, description, and product URL — all publicly visible, no login required.
* **robots.txt result:** no robots file found (404) — a missing file is not permission on its own, but combined with the site's stated purpose above, scraping this sandbox is appropriate here.

I will not reuse this code on another site without checking its rules and terms first.

## Run it

```bash
npm install
node src/index.js
```

First run fetches and caches all pages (~30-40 seconds, 0.5s delay between real requests). Every run after that reads from the local `cache/` folder almost instantly. Output lands in `output/books.json`, `output/errors.json`, and `output/run-report.json`.

## Why this needed no browser

The book data (title, price, availability, description) is already present in the plain HTML the server sends — there's no client-side JavaScript building these pages after load. A browser (Playwright, etc.) would only add startup cost and memory overhead here with zero benefit; `fetch` + Cheerio is the right tool for this specific site.

## Record schema

Each entry in `output/books.json`:

```json
{
  "title": "string",
  "product_url": "string (absolute URL, canonical identity)",
  "price_text": "string, e.g. \"£51.77\"",
  "price_gbp": "number, e.g. 51.77",
  "availability_text": "string, e.g. \"In stock (22 available)\"",
  "rating_text": "string or null, e.g. \"Three\"",
  "description": "string or null",
  "source_page": "string (absolute URL)",
  "fetched_at": "ISO 8601 timestamp"
}
```

Validated with Zod before storage. Records that fail validation go to `output/errors.json` with a reason — never into `books.json`.

## Politeness rules followed

* **User-agent:** every request identifies itself as `FlyRankInternshipA9/1.0 (+https://github.com/Anushka394/flyrank)`
* **Timeout:** every request aborts after 8 seconds rather than hanging
* **Delay:** at least 500ms between real network requests (cached reads are instant and never touch the site)
* **Cache:** every page is saved to `cache/` on first fetch; all later runs during development read from disk, not the network
* **Retry policy:** timeouts and 5xx errors get one retry after a 1s wait; 404s and 403s are never retried (the page doesn't exist, or the site said no — retrying won't change that)

## Failure handling

Each page is fetched independently. If one page fails (network error, timeout, or bad status), it's logged and skipped — the rest of the run continues. Verified by deliberately adding a fake book URL to the list: the run still finished, `books.json` still had all 60 good records, and `run-report.json` correctly reported `failed_pages: 1`.

## Sample run report

A real `output/run-report.json` from a completed run (fully cached, hence `pages_fetched: 0`):

```json
{
  "start_time": "2026-08-16T06:56:57.483Z",
  "duration_ms": 212,
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 0
}
```
