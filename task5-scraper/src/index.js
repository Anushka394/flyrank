const fs = require('fs');
const path = require('path');

const USER_AGENT = 'FlyRankInternshipA9/1.0 (+https://github.com/Anushka394/flyrank)';
const TIMEOUT_MS = 8000;

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

async function fetchAndCache(url, cacheFilename) {
  const cachePath = path.join(__dirname, '..', 'cache', cacheFilename);

  if (fs.existsSync(cachePath)) {
    const html = fs.readFileSync(cachePath, 'utf-8');
    console.log(`CACHE HIT: ${cacheFilename} (${html.length} bytes)`);
    return html;
  }

  const response = await fetchWithTimeout(url);

  if (response.status !== 200) {
    throw new Error(`Failed fetch: ${url} returned status ${response.status}`);
  }

  const html = await response.text();
  fs.writeFileSync(cachePath, html, 'utf-8');
  console.log(`FETCH: ${cacheFilename} (${html.length} bytes)`);
  return html;
}

async function main() {
  await fetchAndCache(
    'https://books.toscrape.com/catalogue/page-1.html',
    'catalogue-page-1.html'
  );
}

main().catch((err) => {
  console.error('Run failed:', err.message);
  process.exit(1);
});