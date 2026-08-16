\# task5-scraper



A polite scraping pipeline that collects 60 books from Books to Scrape,

turns messy HTML into clean, schema-checked JSON, and survives a broken

page without crashing.



\## Target Classification



\- \*\*Site:\*\* books.toscrape.com

\- \*\*Why:\*\* It's explicitly built as a scraping practice sandbox — the

&#x20; parent site (toscrape.com) describes it as "a fictional bookstore that

&#x20; desperately wants to be scraped... a safe place for beginners learning

&#x20; web scraping." Pages on the site also show a "Warning! This is a demo

&#x20; website for web scraping purposes" banner.

\- \*\*Scope:\*\* Only the first 3 catalogue pages (60 books total), nothing more.

\- \*\*Data collected:\*\* Book title, price, availability, rating, description,

&#x20; and product URL — all publicly visible, no login required.

\- \*\*robots.txt result:\*\* no robots file found (404) — a missing file is

&#x20; not permission on its own, but combined with the site's stated purpose

&#x20; above, scraping this sandbox is appropriate here.



I will not reuse this code on another site without checking its rules and

terms first.



\## Run it



```bash

npm install

node src/index.js

```



First run fetches and caches all pages (\~30-40 seconds, 0.5s delay between

real requests). Every run after that reads from the local `cache/` folder

almost instantly. Output lands in `output/books.json`,

`output/errors.json`, and `output/run-report.json`.



\## Why this needed no browser



The book data (title, price, availability, description) is already present

in the plain HTML the server sends — there's no client-side JavaScript

building these pages after load. A browser (Playwright, etc.) would only

add startup cost and memory overhead here with zero benefit; `fetch` +

Cheerio is the right tool for this specific site.



\## Record schema



Each entry in `output/books.json`:



```json

{

&#x20; "title": "string",

&#x20; "product\_url": "string (absolute URL, canonical identity)",

&#x20; "price\_text": "string, e.g. \\"£51.77\\"",

&#x20; "price\_gbp": "number, e.g. 51.77",

&#x20; "availability\_text": "string, e.g. \\"In stock (22 available)\\"",

&#x20; "rating\_text": "string or null, e.g. \\"Three\\"",

&#x20; "description": "string or null",

&#x20; "source\_page": "string (absolute URL)",

&#x20; "fetched\_at": "ISO 8601 timestamp"

}

```



Validated with Zod before storage. Records that fail validation go to

`output/errors.json` with a reason — never into `books.json`.



\## Politeness rules followed



\- \*\*User-agent:\*\* every request identifies itself as

&#x20; `FlyRankInternshipA9/1.0 (+https://github.com/Anushka394/flyrank)`

\- \*\*Timeout:\*\* every request aborts after 8 seconds rather than hanging

\- \*\*Delay:\*\* at least 500ms between real network requests (cached reads

&#x20; are instant and never touch the site)

\- \*\*Cache:\*\* every page is saved to `cache/` on first fetch; all later

&#x20; runs during development read from disk, not the network

\- \*\*Retry policy:\*\* timeouts and 5xx errors get one retry after a 1s

&#x20; wait; 404s and 403s are never retried (the page doesn't exist, or the

&#x20; site said no — retrying won't change that)



\## Failure handling



Each page is fetched independently. If one page fails (network error,

timeout, or bad status), it's logged and skipped — the rest of the run

continues. Verified by deliberately adding a fake book URL to the list:

the run still finished, `books.json` still had all 60 good records, and

`run-report.json` correctly reported `failed\_pages: 1`.



\## Sample run report



A real `output/run-report.json` from a completed run (fully cached, hence

`pages\_fetched: 0`):



```json

{

&#x20; "start\_time": "2026-08-16T06:56:57.483Z",

&#x20; "duration\_ms": 212,

&#x20; "pages\_fetched": 0,

&#x20; "cache\_hits": 63,

&#x20; "valid\_records": 60,

&#x20; "invalid\_records": 0,

&#x20; "failed\_pages":

