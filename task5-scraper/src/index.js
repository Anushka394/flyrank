const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { z } = require('zod');

const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/Anushka394/flyrank)';
const TIMEOUT_MS = 8000;
const DELAY_MS = 500;
const MAX_PAGES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fetches a URL with caching. Retries once on timeout or 5xx. Does NOT
// retry on 404 (page doesn't exist) or 403 (site said no).
// Returns { html, error } — exactly one of the two will be set.
async function fetchAndCache(url, cacheFilename, stats) {
  const cachePath = path.join(__dirname, '..', 'cache', cacheFilename);

  if (fs.existsSync(cachePath)) {
    const html = fs.readFileSync(cachePath, 'utf-8');
    console.log(`CACHE HIT: ${cacheFilename} (${html.length} bytes)`);
    stats.cacheHits++;
    return { html };
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetchWithTimeout(url);

      if (response.status === 200) {
        const html = await response.text();
        fs.writeFileSync(cachePath, html, 'utf-8');
        console.log(`FETCH: ${cacheFilename} (${html.length} bytes)`);
        stats.pagesFetched++;
        await sleep(DELAY_MS);
        return { html };
      }

      if (response.status === 404 || response.status === 403) {
        lastError = `status ${response.status}`;
        break; // do not retry
      }

      // 5xx or other unexpected status — worth one retry
      lastError = `status ${response.status}`;
      if (attempt === 1) {
        await sleep(1000);
        continue;
      }
    } catch (err) {
      // network error or timeout — worth one retry
      lastError = err.name === 'AbortError' ? 'timeout' : err.message;
      if (attempt === 1) {
        await sleep(1000);
        continue;
      }
    }
  }

  console.log(`FAILED: ${cacheFilename} (${lastError})`);
  stats.failedPages.push({ url, reason: lastError });
  return { error: lastError };
}

async function discoverCataloguePages(stats) {
  const bookUrls = new Set();
  let pageNum = 1;
  let pageUrl = 'https://books.toscrape.com/catalogue/page-1.html';
  let pagesFetched = 0;

  while (pageUrl && pageNum <= MAX_PAGES) {
    const cacheFilename = `catalogue-page-${pageNum}.html`;
    const { html } = await fetchAndCache(pageUrl, cacheFilename, stats);
    pagesFetched++;

    const $ = cheerio.load(html);

    $('article.product_pod h3 a').each((_, el) => {
      const href = $(el).attr('href');
      const absoluteUrl = new URL(href, pageUrl).toString();
      bookUrls.add(absoluteUrl);
    });

    const nextHref = $('li.next a').attr('href');
    if (nextHref && pageNum < MAX_PAGES) {
      pageUrl = new URL(nextHref, pageUrl).toString();
      pageNum++;
    } else {
      pageUrl = null;
    }
  }

  return { bookUrls: Array.from(bookUrls), pagesFetched };
}

function cacheNameForBookUrl(url) {
  const parts = url.split('/').filter(Boolean);
  const slug = parts[parts.length - 2] || 'unknown';
  return `book-${slug}.html`;
}

async function extractBookRecord(bookUrl, stats) {
  const cacheFilename = cacheNameForBookUrl(bookUrl);
  const { html, error } = await fetchAndCache(bookUrl, cacheFilename, stats);

  if (error) {
    return null; // this page failed — skip it, already logged in stats
  }

  const $ = cheerio.load(html);
  const main = $('div.product_main');

  const title = main.find('h1').text().trim();
  const price_text = main.find('p.price_color').first().text().trim();
  const availability_text = main.find('p.availability').text().trim().replace(/\s+/g, ' ');

  const ratingClass = main.find('p.star-rating').attr('class') || '';
  const rating_text = ratingClass.replace('star-rating', '').trim() || null;

  const descriptionEl = $('#product_description').next('p').first();
  const description = descriptionEl.length
    ? descriptionEl.text().trim().replace(/\s+/g, ' ')
    : null;

  return {
    title,
    product_url: bookUrl,
    price_text,
    availability_text,
    rating_text,
    description,
    source_page: bookUrl,
    fetched_at: new Date().toISOString(),
  };
}

function normalizeRecord(raw) {
  const priceMatch = raw.price_text.match(/[\d.]+/);
  const price_gbp = priceMatch ? parseFloat(priceMatch[0]) : NaN;
  return { ...raw, price_gbp };
}

const BookSchema = z.object({
  title: z.string().min(1),
  product_url: z.string().url(),
  price_text: z.string().min(1),
  price_gbp: z.number().positive(),
  availability_text: z.string().min(1),
  rating_text: z.string().nullable(),
  description: z.string().nullable(),
  source_page: z.string().url(),
  fetched_at: z.string(),
});

function validateRecord(record) {
  const result = BookSchema.safeParse(record);
  if (result.success) {
    return { valid: true, record: result.data };
  }
  return {
    valid: false,
    reason: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}

async function main() {
  const startTime = Date.now();
  const stats = { pagesFetched: 0, cacheHits: 0, failedPages: [] };

  const { bookUrls, pagesFetched } = await discoverCataloguePages(stats);

  console.log(`catalogue_pages=${pagesFetched}`);
  console.log(`discovered=${bookUrls.length}`);
  console.log(`unique_urls=${bookUrls.length}`);

  // Stage 5 checkpoint: add one deliberately fake URL to prove the run
  // survives a broken page. Uncomment the line below to re-test that.
  // bookUrls.push('https://books.toscrape.com/catalogue/this-book-does-not-exist_0/index.html');

  const seenUrls = new Set();
  const validRecords = [];
  const invalidRecords = [];

  for (const bookUrl of bookUrls) {
    const raw = await extractBookRecord(bookUrl, stats);
    if (raw === null) {
      continue; // fetch failed for this page — already logged, run continues
    }

    const normalized = normalizeRecord(raw);

    if (seenUrls.has(normalized.product_url)) {
      continue;
    }

    const { valid, record, reason } = validateRecord(normalized);
    if (valid) {
      validRecords.push(record);
      seenUrls.add(record.product_url);
    } else {
      invalidRecords.push({ ...normalized, error_reason: reason });
    }
  }

  const outputDir = path.join(__dirname, '..', 'output');
  fs.writeFileSync(
    path.join(outputDir, 'books.json'),
    JSON.stringify(validRecords, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, 'errors.json'),
    JSON.stringify(invalidRecords, null, 2)
  );

  const durationMs = Date.now() - startTime;
  const runReport = {
    start_time: new Date(startTime).toISOString(),
    duration_ms: durationMs,
    pages_fetched: stats.pagesFetched,
    cache_hits: stats.cacheHits,
    valid_records: validRecords.length,
    invalid_records: invalidRecords.length,
    failed_pages: stats.failedPages.length,
    failed_page_details: stats.failedPages,
  };

  fs.writeFileSync(
    path.join(outputDir, 'run-report.json'),
    JSON.stringify(runReport, null, 2)
  );

  console.log(`detail_pages=${bookUrls.length}`);
  console.log(`valid_records=${validRecords.length}`);
  console.log(`invalid_records=${invalidRecords.length}`);
  console.log(`failed_pages=${stats.failedPages.length}`);
}

main().catch((err) => {
  console.error('Run failed:', err.message);
  process.exit(1);
});