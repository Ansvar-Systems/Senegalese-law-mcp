#!/usr/bin/env tsx
/**
 * Senegal Law MCP -- Census-Driven Ingestion Pipeline
 *
 * Reads data/census.json and fetches + parses every ingestable Act.
 *
 * Source types handled:
 *   1. PDF files (droit-afrique.com, africa-laws.org, government sites)
 *      -> Downloaded as binary, text extracted via `pdftotext -layout`
 *   2. HTML pages (WIPO Lex detail pages -> extracts PDF link -> downloads)
 *      -> Falls back to HTML text extraction if no PDF available
 *   3. Generic portal URLs (primature.sn - often unreachable)
 *      -> Uses curated seed if available, marks inaccessible otherwise
 *
 * Features:
 *   - Resume support: skips Acts that already have a seed JSON file
 *   - Census update: writes provision counts + ingestion dates back to census.json
 *   - Rate limiting: 500ms minimum between requests
 *   - PDF text extraction: via `pdftotext` (poppler-utils)
 *
 * Usage:
 *   npm run ingest                    # Full census-driven ingestion
 *   npm run ingest -- --limit 5       # Test with 5 acts
 *   npm run ingest -- --skip-fetch    # Reuse cached files (re-parse only)
 *   npm run ingest -- --force         # Re-ingest even if seed exists
 *   npm run ingest -- --resume        # Same as default (resume from where left off)
 *
 * Data sources: droit-afrique.com, africa-laws.org, primature.sn, WIPO, FAOLEX
 * Format: PDF (pdftotext extraction) / HTML
 * License: Government Open Data / Open Access
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { downloadPdf, fetchWithRateLimit } from './lib/fetcher.js';
import { parseSenegalLawHtml, type ActIndexEntry, type ParsedAct } from './lib/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.resolve(__dirname, '../data/source');
const PDF_DIR = path.resolve(__dirname, '../data/pdf');
const SEED_DIR = path.resolve(__dirname, '../data/seed');
const CENSUS_PATH = path.resolve(__dirname, '../data/census.json');

/* ---------- Types ---------- */

interface CensusLawEntry {
  id: string;
  title: string;
  title_en?: string;
  identifier: string;
  url: string;
  status: 'in_force' | 'amended' | 'repealed';
  category: string;
  classification: 'ingestable' | 'excluded' | 'inaccessible';
  ingested: boolean;
  provision_count: number;
  ingestion_date: string | null;
  year?: string;
  domain?: string;
}

interface CensusFile {
  schema_version: string;
  jurisdiction: string;
  jurisdiction_name: string;
  portal: string;
  census_date: string;
  agent: string;
  summary: {
    total_laws: number;
    ingestable: number;
    ocr_needed: number;
    inaccessible: number;
    excluded: number;
  };
  laws: CensusLawEntry[];
}

/* ---------- Helpers ---------- */

function parseArgs(): { limit: number | null; skipFetch: boolean; force: boolean } {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let skipFetch = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--skip-fetch') {
      skipFetch = true;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  return { limit, skipFetch, force };
}

/**
 * Determine whether a URL points to a PDF file.
 */
function isPdfUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith('.pdf') || lower.includes('.pdf?') || lower.includes('/pdf/');
}

/**
 * Determine whether a URL is a WIPO Lex detail page (which links to PDFs).
 */
function isWipoLexUrl(url: string): boolean {
  return url.includes('wipo.int/wipolex');
}

/**
 * Determine whether a URL is a generic portal placeholder that cannot be fetched directly.
 */
function isGenericPortalUrl(url: string): boolean {
  return url.includes('primature.sn/publications/lois-et-reglements') && !url.includes('/code-');
}

/**
 * Extract text from a PDF using pdftotext (poppler-utils).
 * Falls back to empty string if pdftotext is not available or fails.
 */
function extractTextFromPdf(pdfPath: string): string {
  const result = spawnSync('pdftotext', ['-layout', pdfPath, '-'], {
    maxBuffer: 50 * 1024 * 1024,
    encoding: 'utf-8',
    timeout: 60_000,
  });

  if (result.error) {
    console.log(`    pdftotext error: ${result.error.message}`);
    return '';
  }

  if (result.status !== 0) {
    console.log(`    pdftotext exit ${result.status}: ${(result.stderr ?? '').substring(0, 200)}`);
    return '';
  }

  return result.stdout ?? '';
}

/**
 * Extract a PDF download link from a WIPO Lex detail page.
 */
function extractWipoPdfLink(html: string, pageUrl: string): string | null {
  // WIPO Lex embeds PDF links in various formats
  const patterns = [
    /href="([^"]+\.pdf)"/gi,
    /data-url="([^"]+\.pdf)"/gi,
    /(https:\/\/wipolex-res\.wipo\.int\/[^"'\s]+\.pdf)/gi,
    /(\/wipolex\/[^"'\s]+\.pdf)/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match) {
      const link = match[1];
      if (link.startsWith('http')) return link;
      try {
        return new URL(link, pageUrl).toString();
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Convert a census entry to an ActIndexEntry for the parser.
 */
function censusToActEntry(law: CensusLawEntry): ActIndexEntry {
  return {
    id: law.id,
    title: law.title,
    titleEn: law.title_en ?? law.title,
    shortName: law.title.length > 40 ? law.title.substring(0, 37) + '...' : law.title,
    status: law.status === 'in_force' ? 'in_force' : law.status === 'amended' ? 'amended' : 'repealed',
    issuedDate: '',
    inForceDate: '',
    url: law.url,
    description: '',
  };
}

/* ---------- Main ---------- */

async function main(): Promise<void> {
  const { limit, skipFetch, force } = parseArgs();

  console.log('Senegal Law MCP -- Ingestion Pipeline (Census-Driven)');
  console.log('====================================================\n');
  console.log(`  Sources: droit-afrique.com, africa-laws.org, WIPO, gov portals`);
  console.log(`  Format: PDF (pdftotext) / HTML`);
  console.log(`  License: Government Open Data / Open Access`);

  if (limit) console.log(`  --limit ${limit}`);
  if (skipFetch) console.log(`  --skip-fetch`);
  if (force) console.log(`  --force (re-ingest all)`);

  // Check pdftotext availability
  const pdftotextCheck = spawnSync('pdftotext', ['-v'], { encoding: 'utf-8' });
  if (pdftotextCheck.error) {
    console.error('\nERROR: pdftotext not found. Install poppler-utils:');
    console.error('  sudo apt install poppler-utils  (Debian/Ubuntu)');
    console.error('  brew install poppler  (macOS)');
    process.exit(1);
  }
  console.log(`  pdftotext: available`);

  // Load census
  if (!fs.existsSync(CENSUS_PATH)) {
    console.error(`\nERROR: Census file not found at ${CENSUS_PATH}`);
    console.error('Run "npx tsx scripts/census.ts" first.');
    process.exit(1);
  }

  const census: CensusFile = JSON.parse(fs.readFileSync(CENSUS_PATH, 'utf-8'));
  const ingestable = census.laws.filter(l => l.classification === 'ingestable');
  const acts = limit ? ingestable.slice(0, limit) : ingestable;

  console.log(`\n  Census: ${census.summary.total_laws} total, ${ingestable.length} ingestable`);
  console.log(`  Processing: ${acts.length} acts\n`);

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.mkdirSync(PDF_DIR, { recursive: true });
  fs.mkdirSync(SEED_DIR, { recursive: true });

  let processed = 0;
  let ingested = 0;
  let skipped = 0;
  let failed = 0;
  let usedCurated = 0;
  let totalProvisions = 0;
  let totalDefinitions = 0;
  const results: { act: string; provisions: number; definitions: number; status: string; method: string }[] = [];

  // Build a map for census updates
  const censusMap = new Map<string, CensusLawEntry>();
  for (const law of census.laws) {
    censusMap.set(law.id, law);
  }

  const today = new Date().toISOString().split('T')[0];

  for (const law of acts) {
    const act = censusToActEntry(law);
    const pdfFile = path.join(PDF_DIR, `${act.id}.pdf`);
    const sourceFile = path.join(SOURCE_DIR, `${act.id}.txt`);
    const seedFile = path.join(SEED_DIR, `${act.id}.json`);

    // Resume support: skip if seed already exists (unless --force)
    if (!force && fs.existsSync(seedFile)) {
      try {
        const existing = JSON.parse(fs.readFileSync(seedFile, 'utf-8')) as ParsedAct;
        const provCount = existing.provisions?.length ?? 0;
        const defCount = existing.definitions?.length ?? 0;
        totalProvisions += provCount;
        totalDefinitions += defCount;

        // Update census entry
        const entry = censusMap.get(law.id);
        if (entry) {
          entry.ingested = true;
          entry.provision_count = provCount;
          entry.ingestion_date = entry.ingestion_date ?? today;
        }

        results.push({ act: act.shortName, provisions: provCount, definitions: defCount, status: 'resumed', method: 'cached' });
        skipped++;
        processed++;
        continue;
      } catch {
        // Corrupt seed file, re-ingest
      }
    }

    try {
      let text = '';
      let method = 'unknown';

      if (isPdfUrl(law.url)) {
        // ---------- PDF source ----------
        method = 'pdf';

        if (fs.existsSync(pdfFile) && skipFetch) {
          console.log(`  [${processed + 1}/${acts.length}] Using cached PDF ${act.id}`);
        } else if (fs.existsSync(pdfFile) && !force) {
          console.log(`  [${processed + 1}/${acts.length}] Reusing downloaded PDF ${act.id}`);
        } else {
          process.stdout.write(`  [${processed + 1}/${acts.length}] Downloading PDF ${act.id}...`);
          const dlResult = await downloadPdf(law.url, pdfFile);

          if (dlResult.status !== 200) {
            console.log(` HTTP ${dlResult.status}`);
            const entry = censusMap.get(law.id);
            if (entry) entry.classification = 'inaccessible';
            results.push({ act: act.shortName, provisions: 0, definitions: 0, status: `HTTP ${dlResult.status}`, method: 'pdf' });
            failed++;
            processed++;
            continue;
          }
          console.log(` OK (${(dlResult.size / 1024).toFixed(0)} KB)`);
        }

        // Extract text from PDF
        text = extractTextFromPdf(pdfFile);
        if (text.trim().length < 50) {
          console.log(`    WARNING: pdftotext produced minimal output (${text.trim().length} chars) - possibly scanned/image PDF`);
          // Check if we have a curated seed
          method = 'pdf_minimal';
        }

        // Cache the extracted text
        fs.writeFileSync(sourceFile, text);

      } else if (isWipoLexUrl(law.url)) {
        // ---------- WIPO Lex source ----------
        method = 'wipo';

        // First fetch the detail page
        process.stdout.write(`  [${processed + 1}/${acts.length}] Fetching WIPO detail ${act.id}...`);
        const detailResult = await fetchWithRateLimit(law.url);

        if (detailResult.status !== 200) {
          console.log(` HTTP ${detailResult.status}`);
          const entry = censusMap.get(law.id);
          if (entry) entry.classification = 'inaccessible';
          results.push({ act: act.shortName, provisions: 0, definitions: 0, status: `HTTP ${detailResult.status}`, method: 'wipo' });
          failed++;
          processed++;
          continue;
        }

        // Try to find a PDF link
        const pdfLink = extractWipoPdfLink(detailResult.body, detailResult.url);
        if (pdfLink) {
          console.log(` found PDF`);
          const dlResult = await downloadPdf(pdfLink, pdfFile);
          if (dlResult.status === 200) {
            text = extractTextFromPdf(pdfFile);
            fs.writeFileSync(sourceFile, text);
          } else {
            console.log(`    PDF download failed: HTTP ${dlResult.status}`);
            // Fall back to HTML text extraction
            text = detailResult.body;
            method = 'wipo_html';
          }
        } else {
          console.log(` no PDF link found, using HTML`);
          text = detailResult.body;
          method = 'wipo_html';
        }

      } else if (isGenericPortalUrl(law.url)) {
        // ---------- Generic portal URL (likely unreachable) ----------
        method = 'portal';

        // Check if we already have a cached source
        if (fs.existsSync(sourceFile) && skipFetch) {
          text = fs.readFileSync(sourceFile, 'utf-8');
          console.log(`  [${processed + 1}/${acts.length}] Using cached source ${act.id}`);
        } else {
          // Try fetching the portal
          process.stdout.write(`  [${processed + 1}/${acts.length}] Trying portal for ${act.id}...`);
          try {
            const portalResult = await fetchWithRateLimit(law.url, 1);
            if (portalResult.status === 200 && portalResult.body.length > 1000) {
              console.log(` OK (${(portalResult.body.length / 1024).toFixed(0)} KB)`);
              text = portalResult.body;
              fs.writeFileSync(sourceFile, text);
            } else {
              console.log(` insufficient content (${portalResult.body.length} bytes)`);
              method = 'inaccessible';
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.log(` failed: ${msg.substring(0, 80)}`);
            method = 'inaccessible';
          }
        }
      } else {
        // ---------- Other URL (try as HTML or PDF based on content) ----------
        method = 'html';

        if (fs.existsSync(sourceFile) && skipFetch) {
          text = fs.readFileSync(sourceFile, 'utf-8');
          console.log(`  [${processed + 1}/${acts.length}] Using cached ${act.id}`);
        } else {
          process.stdout.write(`  [${processed + 1}/${acts.length}] Fetching ${act.id}...`);
          const result = await fetchWithRateLimit(law.url);

          if (result.status !== 200) {
            console.log(` HTTP ${result.status}`);
            const entry = censusMap.get(law.id);
            if (entry) entry.classification = 'inaccessible';
            results.push({ act: act.shortName, provisions: 0, definitions: 0, status: `HTTP ${result.status}`, method });
            failed++;
            processed++;
            continue;
          }

          text = result.body;
          fs.writeFileSync(sourceFile, text);
          console.log(` OK (${(text.length / 1024).toFixed(0)} KB)`);
        }
      }

      // If we got no text and the method is inaccessible, mark it
      if (method === 'inaccessible' || text.trim().length < 50) {
        // Check if curated seed already exists (from generate-seeds.ts)
        if (fs.existsSync(seedFile)) {
          try {
            const existing = JSON.parse(fs.readFileSync(seedFile, 'utf-8')) as ParsedAct;
            const provCount = existing.provisions?.length ?? 0;
            const defCount = existing.definitions?.length ?? 0;
            totalProvisions += provCount;
            totalDefinitions += defCount;

            const entry = censusMap.get(law.id);
            if (entry) {
              entry.ingested = true;
              entry.provision_count = provCount;
              entry.ingestion_date = entry.ingestion_date ?? today;
            }

            results.push({ act: act.shortName, provisions: provCount, definitions: defCount, status: 'curated_seed', method: 'curated' });
            usedCurated++;
            processed++;
            continue;
          } catch {
            // Corrupt seed
          }
        }

        const entry = censusMap.get(law.id);
        if (entry) entry.classification = 'inaccessible';
        results.push({ act: act.shortName, provisions: 0, definitions: 0, status: 'no_text', method });
        failed++;
        processed++;
        continue;
      }

      // Parse the text into provisions
      const parsed = parseSenegalLawHtml(text, act);

      // If the parsed result has 0 provisions and we have a curated seed, prefer the seed
      if (parsed.provisions.length === 0 && fs.existsSync(seedFile)) {
        try {
          const existing = JSON.parse(fs.readFileSync(seedFile, 'utf-8')) as ParsedAct;
          if (existing.provisions && existing.provisions.length > 0) {
            const provCount = existing.provisions.length;
            const defCount = existing.definitions?.length ?? 0;
            totalProvisions += provCount;
            totalDefinitions += defCount;

            const entry = censusMap.get(law.id);
            if (entry) {
              entry.ingested = true;
              entry.provision_count = provCount;
              entry.ingestion_date = entry.ingestion_date ?? today;
            }

            results.push({ act: act.shortName, provisions: provCount, definitions: defCount, status: 'curated_preferred', method: 'curated' });
            usedCurated++;
            processed++;
            continue;
          }
        } catch {
          // Continue with parsed result
        }
      }

      // Enrich with title_en from census if available
      if (law.title_en) {
        parsed.title_en = law.title_en;
      }

      fs.writeFileSync(seedFile, JSON.stringify(parsed, null, 2));
      totalProvisions += parsed.provisions.length;
      totalDefinitions += parsed.definitions.length;
      console.log(`    -> ${parsed.provisions.length} provisions, ${parsed.definitions.length} definitions [${method}]`);

      // Update census entry
      const entry = censusMap.get(law.id);
      if (entry) {
        entry.ingested = true;
        entry.provision_count = parsed.provisions.length;
        entry.ingestion_date = today;
      }

      results.push({
        act: act.shortName,
        provisions: parsed.provisions.length,
        definitions: parsed.definitions.length,
        status: 'OK',
        method,
      });
      ingested++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ERROR for ${act.id}: ${msg.substring(0, 120)}`);
      results.push({ act: act.shortName, provisions: 0, definitions: 0, status: `ERROR: ${msg.substring(0, 80)}`, method: 'error' });
      failed++;
    }

    processed++;

    // Save census every 20 acts (checkpoint)
    if (processed % 20 === 0) {
      writeCensus(census, censusMap);
      console.log(`  [checkpoint] Census updated at ${processed}/${acts.length}`);
    }
  }

  // Final census update
  writeCensus(census, censusMap);

  // Report
  console.log(`\n${'='.repeat(70)}`);
  console.log('Ingestion Report');
  console.log('='.repeat(70));
  console.log(`\n  Sources:     droit-afrique.com, africa-laws.org, WIPO, gov portals`);
  console.log(`  Processed:   ${processed}`);
  console.log(`  New:         ${ingested}`);
  console.log(`  Resumed:     ${skipped}`);
  console.log(`  Curated:     ${usedCurated}`);
  console.log(`  Failed:      ${failed}`);
  console.log(`  Total provisions:  ${totalProvisions}`);
  console.log(`  Total definitions: ${totalDefinitions}`);

  // Method breakdown
  const methodCounts = new Map<string, number>();
  for (const r of results) {
    methodCounts.set(r.method, (methodCounts.get(r.method) ?? 0) + 1);
  }
  console.log(`\n  Method breakdown:`);
  for (const [m, c] of [...methodCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${m}: ${c}`);
  }

  // Summary of failures
  const failures = results.filter(r => r.status.startsWith('HTTP') || r.status.startsWith('ERROR') || r.status === 'no_text');
  if (failures.length > 0) {
    console.log(`\n  Failed acts (${failures.length}):`);
    for (const f of failures) {
      console.log(`    ${f.act}: ${f.status} [${f.method}]`);
    }
  }

  // Zero-provision acts
  const zeroProv = results.filter(r => r.provisions === 0 && r.status === 'OK');
  if (zeroProv.length > 0) {
    console.log(`\n  Zero-provision acts (${zeroProv.length}):`);
    for (const z of zeroProv.slice(0, 20)) {
      console.log(`    ${z.act} [${z.method}]`);
    }
    if (zeroProv.length > 20) {
      console.log(`    ... and ${zeroProv.length - 20} more`);
    }
  }

  console.log('');
}

function writeCensus(census: CensusFile, censusMap: Map<string, CensusLawEntry>): void {
  // Update the laws array from the map
  census.laws = Array.from(censusMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title, 'fr'),
  );

  // Recalculate summary
  census.summary.total_laws = census.laws.length;
  census.summary.ingestable = census.laws.filter(l => l.classification === 'ingestable').length;
  census.summary.inaccessible = census.laws.filter(l => l.classification === 'inaccessible').length;
  census.summary.excluded = census.laws.filter(l => l.classification === 'excluded').length;

  fs.writeFileSync(CENSUS_PATH, JSON.stringify(census, null, 2));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
