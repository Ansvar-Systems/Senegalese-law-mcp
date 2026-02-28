/**
 * Senegal Law HTML/Text Parser
 *
 * Parses French-language legislation from Senegalese legal portals.
 * Handles common French legislative text structures:
 *   - Articles: "Article N" or "Art. N"
 *   - Chapters: "Chapitre N" or "CHAPITRE PREMIER"
 *   - Titles: "Titre N" or "TITRE PREMIER"
 *   - Sections: "Section N"
 *
 * Supports both HTML pages (from portals) and plain text (from PDF extraction).
 *
 * Source: primature.sn / africa-laws.org / jo.gouv.sn
 */

export interface ActIndexEntry {
  id: string;
  title: string;
  titleEn: string;
  shortName: string;
  status: 'in_force' | 'amended' | 'repealed' | 'not_yet_in_force';
  issuedDate: string;
  inForceDate: string;
  url: string;
  aknYear?: string;
  aknNumber?: string;
  description?: string;
}

export interface ParsedProvision {
  provision_ref: string;
  chapter?: string;
  section: string;
  title: string;
  content: string;
}

export interface ParsedDefinition {
  term: string;
  definition: string;
  source_provision?: string;
}

export interface ParsedAct {
  id: string;
  type: 'statute';
  title: string;
  title_en: string;
  short_name: string;
  status: string;
  issued_date: string;
  in_force_date: string;
  url: string;
  description?: string;
  provisions: ParsedProvision[];
  definitions: ParsedDefinition[];
}

/* ---------- French number words ---------- */

const FRENCH_ORDINALS: Record<string, number> = {
  premier: 1, premiere: 1, 'premi\u00e8re': 1,
  deuxieme: 2, 'deuxi\u00e8me': 2, second: 2, seconde: 2,
  troisieme: 3, 'troisi\u00e8me': 3,
  quatrieme: 4, 'quatri\u00e8me': 4,
  cinquieme: 5, 'cinqui\u00e8me': 5,
  sixieme: 6, 'sixi\u00e8me': 6,
  septieme: 7, 'septi\u00e8me': 7,
  huitieme: 8, 'huiti\u00e8me': 8,
  neuvieme: 9, 'neuvi\u00e8me': 9,
  dixieme: 10, 'dixi\u00e8me': 10,
};

function parseFrenchOrdinal(word: string): number | null {
  const lower = word.toLowerCase().trim();
  return FRENCH_ORDINALS[lower] ?? null;
}

/* ---------- HTML / text helpers ---------- */

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|li|ul|ol|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '\u00ab')
    .replace(/&raquo;/g, '\u00bb')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------- Article detection regexes ---------- */

/**
 * Detect French article headings in text.
 * Patterns:
 *   "Article 1" / "Article 1er" / "Article premier"
 *   "Art. 1" / "Art. 1er"
 *   "ARTICLE 1" / "ARTICLE PREMIER"
 */
const ARTICLE_PATTERN = /^(?:Article|Art\.?)\s+(\d+(?:\s*(?:bis|ter|quater|quinquies|sexies|septies|octies|novies|decies))?(?:\s*-\s*\d+)?|premier|premi\u00e8re)\s*(?:[.:\-\u2013\u2014])?\s*(.*)/i;

/**
 * Detect chapter headings.
 * "Chapitre I" / "CHAPITRE PREMIER" / "Chapitre 1er"
 */
const CHAPTER_PATTERN = /^(?:CHAPITRE|Chapitre)\s+([IVXLCDM]+|\d+(?:\s*er)?|premier|premi\u00e8re|[a-z\u00e0-\u00ff]+)\s*(?:[.:\-\u2013\u2014])?\s*(.*)/i;

/**
 * Detect title (titre) headings.
 * "Titre I" / "TITRE PREMIER"
 */
const TITLE_PATTERN = /^(?:TITRE|Titre)\s+([IVXLCDM]+|\d+(?:\s*er)?|premier|premi\u00e8re|[a-z\u00e0-\u00ff]+)\s*(?:[.:\-\u2013\u2014])?\s*(.*)/i;

/**
 * Detect section headings.
 * "Section 1" / "Section premi\u00e8re"
 */
const SECTION_PATTERN = /^(?:SECTION|Section)\s+(\d+(?:\s*(?:\u00e8re|re))?|premi\u00e8re|[a-z\u00e0-\u00ff]+)\s*(?:[.:\-\u2013\u2014])?\s*(.*)/i;

/* ---------- Roman numeral helpers ---------- */

function romanToArabic(roman: string): number {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  const upper = roman.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const current = values[upper[i]] ?? 0;
    const next = values[upper[i + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

function normalizeChapterNumber(raw: string): string {
  const cleaned = raw.trim();
  // Roman numeral
  if (/^[IVXLCDM]+$/i.test(cleaned)) {
    return String(romanToArabic(cleaned));
  }
  // "1er" or plain number
  if (/^\d+/.test(cleaned)) {
    return cleaned.replace(/\s*(er|re|\u00e8re)$/i, '');
  }
  // French word
  const ord = parseFrenchOrdinal(cleaned);
  if (ord !== null) return String(ord);
  return cleaned;
}

function normalizeArticleNumber(raw: string): string {
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'premier' || cleaned === 'premi\u00e8re') return '1';
  // "1er" -> "1"
  return raw.trim().replace(/\s*(er|re|\u00e8re)$/i, '');
}

/* ---------- Main parser ---------- */

/**
 * Parse Senegalese law HTML or text content into structured provisions.
 */
export function parseSenegalLawHtml(html: string, act: ActIndexEntry): ParsedAct {
  // Convert HTML to plain text, preserving line breaks
  const text = stripHtml(html);
  return parseFrenchLawText(text, act);
}

/**
 * Parse French-language law text into provisions.
 * This is the core parser that handles both HTML-extracted text and plain text.
 */
export function parseFrenchLawText(rawText: string, act: ActIndexEntry): ParsedAct {
  const text = normalizeWhitespace(rawText);
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const provisions: ParsedProvision[] = [];
  const definitions: ParsedDefinition[] = [];

  let currentChapter: string | undefined;
  let currentTitre: string | undefined;
  let currentSection: string | undefined;
  let currentArticleNum: string | undefined;
  let currentArticleTitle: string | undefined;
  let currentArticleRef: string | undefined;
  let currentContent: string[] = [];

  const flushArticle = (): void => {
    if (!currentArticleNum || !currentArticleRef) return;
    const content = currentContent.join(' ').trim();
    if (content.length < 3) return;

    const chapterLabel = [currentTitre, currentChapter, currentSection]
      .filter(Boolean)
      .join(' > ') || undefined;

    provisions.push({
      provision_ref: currentArticleRef,
      chapter: chapterLabel,
      section: currentArticleNum,
      title: currentArticleTitle ?? `Article ${currentArticleNum}`,
      content: content.substring(0, 12000),
    });

    // Check for definitions in this article
    if (/d[e\u00e9]finition|sens\s+d[ue]\s+la\s+pr[e\u00e9]sente|on\s+entend\s+par|au\s+sens\s+d[ue]/i.test(content)) {
      extractFrenchDefinitions(content, currentArticleRef, definitions);
    }
  };

  for (const line of lines) {
    // Title (Titre) heading
    const titreMatch = line.match(TITLE_PATTERN);
    if (titreMatch) {
      const num = normalizeChapterNumber(titreMatch[1]);
      const heading = titreMatch[2]?.trim() ?? '';
      currentTitre = heading ? `Titre ${num} - ${heading}` : `Titre ${num}`;
      continue;
    }

    // Chapter heading
    const chapterMatch = line.match(CHAPTER_PATTERN);
    if (chapterMatch) {
      const num = normalizeChapterNumber(chapterMatch[1]);
      const heading = chapterMatch[2]?.trim() ?? '';
      currentChapter = heading ? `Chapitre ${num} - ${heading}` : `Chapitre ${num}`;
      continue;
    }

    // Section heading
    const sectionMatch = line.match(SECTION_PATTERN);
    if (sectionMatch) {
      const num = normalizeChapterNumber(sectionMatch[1]);
      const heading = sectionMatch[2]?.trim() ?? '';
      currentSection = heading ? `Section ${num} - ${heading}` : `Section ${num}`;
      continue;
    }

    // Article heading
    const articleMatch = line.match(ARTICLE_PATTERN);
    if (articleMatch) {
      flushArticle();
      const rawNum = normalizeArticleNumber(articleMatch[1]);
      currentArticleNum = rawNum;
      currentArticleRef = `art${rawNum}`;
      const titlePart = articleMatch[2]?.trim() ?? '';
      currentArticleTitle = titlePart
        ? `Article ${rawNum} - ${titlePart}`
        : `Article ${rawNum}`;
      currentContent = [];
      // If the rest of the line has content after the title, include it
      if (titlePart && !CHAPTER_PATTERN.test(titlePart) && !TITLE_PATTERN.test(titlePart)) {
        currentContent.push(titlePart);
      }
      continue;
    }

    // Regular content line
    if (currentArticleNum) {
      currentContent.push(line);
    }
  }

  // Flush last article
  flushArticle();

  return {
    id: act.id,
    type: 'statute',
    title: act.title,
    title_en: act.titleEn,
    short_name: act.shortName,
    status: act.status,
    issued_date: act.issuedDate,
    in_force_date: act.inForceDate,
    url: act.url,
    description: act.description,
    provisions,
    definitions,
  };
}

/**
 * Extract French-language definitions from article content.
 * Patterns:
 *   "terme" : definition
 *   On entend par "terme" : definition
 *   terme : au sens de la presente loi, definition
 */
function extractFrenchDefinitions(
  text: string,
  sourceProvision: string,
  definitions: ParsedDefinition[],
): void {
  const seen = new Set(definitions.map(d => d.term.toLowerCase()));

  // Pattern 1: "term" : definition (or \u00ab term \u00bb)
  const quotedPattern = /(?:["\u201c\u00ab])([^"\u201d\u00bb]{2,80})(?:["\u201d\u00bb])\s*(?::|,|:)\s*([^;.]{5,500})/gi;
  let match: RegExpExecArray | null;

  while ((match = quotedPattern.exec(text)) !== null) {
    const term = match[1].trim();
    const definition = match[2].trim();
    const key = term.toLowerCase();
    if (!seen.has(key) && term.length >= 2 && definition.length >= 5) {
      seen.add(key);
      definitions.push({ term, definition, source_provision: sourceProvision });
    }
  }

  // Pattern 2: on entend par + term + , + definition
  const entendPattern = /on\s+entend\s+par\s+(?:["\u201c\u00ab])?([^"\u201d\u00bb,]{2,80})(?:["\u201d\u00bb])?\s*[,:]\s*([^;.]{5,500})/gi;
  while ((match = entendPattern.exec(text)) !== null) {
    const term = match[1].trim();
    const definition = match[2].trim();
    const key = term.toLowerCase();
    if (!seen.has(key) && term.length >= 2 && definition.length >= 5) {
      seen.add(key);
      definitions.push({ term, definition, source_provision: sourceProvision });
    }
  }

  // Pattern 3: d\u00e9signe ... (term) d\u00e9signe definition
  const designePattern = /([A-Z\u00c0-\u00dc][a-z\u00e0-\u00ff\s]{2,60})\s+d[e\u00e9]signe\s+([^;.]{5,500})/g;
  while ((match = designePattern.exec(text)) !== null) {
    const term = match[1].trim();
    const definition = match[2].trim();
    const key = term.toLowerCase();
    if (!seen.has(key) && term.length >= 2 && definition.length >= 5) {
      seen.add(key);
      definitions.push({ term, definition, source_provision: sourceProvision });
    }
  }
}

export function parseHtml(html: string, act: ActIndexEntry): ParsedAct {
  return parseSenegalLawHtml(html, act);
}
