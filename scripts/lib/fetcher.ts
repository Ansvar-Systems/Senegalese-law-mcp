/**
 * Rate-limited HTTP client for Senegal Law MCP
 *
 * Supports:
 * - HTML page fetching (text/html)
 * - Binary PDF downloading
 * - 500ms minimum delay between requests (be respectful to servers)
 * - User-Agent header identifying the MCP
 * - Retry with exponential backoff on 429/5xx
 * - WIPO Lex full text extraction (fetches PDF link from detail page)
 */

import * as fs from 'fs';

const USER_AGENT = 'senegalese-law-mcp/1.0 (https://github.com/Ansvar-Systems/senegalese-law-mcp; hello@ansvar.ai)';
const MIN_DELAY_MS = 500;

let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export interface FetchResult {
  status: number;
  body: string;
  contentType: string;
  url: string;
}

export interface BinaryFetchResult {
  status: number;
  data: Buffer;
  contentType: string;
  url: string;
}

/**
 * Fetch a URL (text) with rate limiting and proper headers.
 * Retries up to 3 times on 429/5xx errors with exponential backoff.
 */
export async function fetchWithRateLimit(url: string, maxRetries = 3): Promise<FetchResult> {
  await rateLimit();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html, application/xhtml+xml, */*',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt + 1) * 1000;
          console.log(`  HTTP ${response.status} for ${url}, retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
      }

      const body = await response.text();
      return {
        status: response.status,
        body,
        contentType: response.headers.get('content-type') ?? '',
        url: response.url,
      };
    } catch (error) {
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`  Error fetching ${url}: ${msg}, retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Fetch a binary resource (PDF) with rate limiting.
 */
export async function fetchBinaryWithRateLimit(url: string, maxRetries = 3): Promise<BinaryFetchResult> {
  await rateLimit();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/pdf, */*',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(60_000),
      });

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt + 1) * 1000;
          console.log(`  HTTP ${response.status} for ${url}, retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
      }

      const arrayBuffer = await response.arrayBuffer();
      return {
        status: response.status,
        data: Buffer.from(arrayBuffer),
        contentType: response.headers.get('content-type') ?? '',
        url: response.url,
      };
    } catch (error) {
      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`  Error fetching ${url}: ${msg}, retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to fetch binary ${url} after ${maxRetries} retries`);
}

/**
 * Download a PDF from a URL and save to disk.
 * Returns the path to the saved file.
 */
export async function downloadPdf(url: string, outputPath: string): Promise<{ status: number; size: number }> {
  const result = await fetchBinaryWithRateLimit(url);

  if (result.status !== 200) {
    return { status: result.status, size: 0 };
  }

  fs.writeFileSync(outputPath, result.data);
  return { status: result.status, size: result.data.length };
}

/**
 * Resolve a URL against a base URL for relative links.
 */
export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}
