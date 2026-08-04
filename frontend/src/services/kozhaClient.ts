/**
 * Kozha client pipeline — a faithful TypeScript port of the real zhan-a/Kozha
 * frontend translation logic (from `public/index.html`).
 *
 * Real Kozha splits translation across client and server:
 *   - server: spaCy NLP + grammar reordering → a normalized *gloss* string.
 *   - client: load the shipped `*.sigml` sign databases, then map each gloss to
 *     its SiGML entry (`glossToSign`), with concept/base fuzzy fallbacks and
 *     letter-by-letter fingerspelling for anything unknown.
 *
 * This module owns the client half: loading the BSL/ISL databases shipped in
 * `frontend/public/data/`, building the gloss→SiGML maps, and composing the
 * final `<sigml>…</sigml>` string that CWASA plays.
 *
 * NOTE: entries are used verbatim (no token stripping/sanitising) — the real
 * databases contain valid HamNoSys tokens the old `sanitizeSigml()` destroyed.
 */

export type SignLanguageCode = 'bsl' | 'isl';

export interface SignBreakdownItem {
  word: string;
  gloss: string;
  isFingerspelled: boolean;
  hamnosys?: string;
  sigml: string;
}

export interface ProcessedSignSequence {
  tokens: string[];
  sigmlSequence: string;
  signBreakdown: SignBreakdownItem[];
  facialExpression?: string;
  plannerSource?: string;
}

// Sign-language database configuration (BSL + ISL only).
// File paths are relative to `frontend/public` and served as `/data/…`.
interface SignLangDb {
  sigml: string[];
  csv: string | null;
  alphabet: string | null;
}

const SIGN_LANG_DB: Record<SignLanguageCode, SignLangDb> = {
  bsl: {
    sigml: ['/data/hamnosys_bsl_version1.sigml'],
    csv: '/data/hamnosys_bsl.csv',
    alphabet: '/data/bsl_alphabet_sigml.sigml',
  },
  isl: {
    sigml: ['/data/Indian_SL.sigml'],
    csv: null,
    alphabet: null, // ISL embeds 23 letters; missing ones use the BSL fallback below
  },
};

// Mirrors Kozha's FALLBACK_ALPHABET — used when a language's database does not
// cover all 26 fingerspelled letters.
const FALLBACK_ALPHABET = '/data/bsl_alphabet_sigml.sigml';

// Container tags are structural, not handshape tokens — the validator must not
// report them as "unknown".
const CONTAINER_TAGS = new Set([
  'hamnosys_manual',
  'hamnosys_nonmanual',
  'hamgestural_sign',
  'hns_sign',
  'sigml',
]);

// Per-language gloss maps, rebuilt on each `prepare()`.
const glossToSign = new Map<string, string>(); // gloss -> SiGML (verbatim)
const baseToGloss = new Map<string, string>(); // glossBase(gloss) -> gloss
const conceptToGloss = new Map<string, string>(); // glossBase(concept) -> gloss
const letterToSign = new Map<string, string>(); // 'A'..'Z' -> SiGML

let _readyLang: SignLanguageCode | null = null;
let _preparing: Promise<void> | null = null;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'than', 'of', 'to', 'in', 'on',
  'at', 'for', 'from', 'with', 'as', 'by', 'is', 'are', 'am', 'be', 'been', 'was',
  'were', 'do', 'does', 'did', 'that', 'this', 'those', 'these', 'it', 'my', 'your', 'our',
]);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface Validator {
  validateHnsSignXml?: (s: string) => { valid: boolean; reason?: string; unknownTags?: string[] };
}

function getValidator(): Validator | null {
  if (typeof window !== 'undefined') {
    const v = (window as any).SigmlValidator as Validator | undefined;
    if (v && typeof v.validateHnsSignXml === 'function') return v;
  }
  return null;
}

/**
 * Validate a single `<hns_sign>` fragment against the CWASA HamNoSys tag set.
 * Mirrors Kozha's `buildSigml`: if CWASA (and thus the known tag set) is not
 * loaded yet, accept the entry ("unchecked") rather than reject it.
 */
function validateHnsSign(entry: string): { valid: boolean; unknownTags: string[] } {
  const validator = getValidator();
  if (!validator) return { valid: true, unknownTags: [] };
  const result = validator.validateHnsSignXml!(entry);
  return { valid: result.valid, unknownTags: result.unknownTags || [] };
}

function hasObjectLiteral(str: string): boolean {
  return str.indexOf('[object Object]') !== -1;
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

function glossBase(gloss: string): string {
  return String(gloss)
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/#\d+$/g, '')
    .replace(/\d+[a-z]?\^?$/g, '')
    .replace(/^_num-/g, '')
    .replace(/_\(.*?\)/g, '')
    .replace(/[^a-z0-9À-ɏͰ-ϿЀ-ӿ]/g, ' ')
    .trim();
}

function rebuildBaseIndex() {
  baseToGloss.clear();
  for (const g of glossToSign.keys()) {
    const b = glossBase(g);
    if (!baseToGloss.has(b)) baseToGloss.set(b, g);
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.warn('[kozhaClient] load error:', url, e);
    return null;
  }
}

async function loadSigmlUrl(url: string) {
  const xmlText = await fetchText(url);
  if (!xmlText) return;
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const signs = Array.from(doc.querySelectorAll('hns_sign'));
  for (const s of signs) {
    const gloss = (s.getAttribute('gloss') || '').trim().toLowerCase();
    if (!gloss) continue;
    glossToSign.set(gloss, s.outerHTML);
  }
  rebuildBaseIndex();
}

async function loadAlphabetSigmlUrl(url: string) {
  const xmlText = await fetchText(url);
  if (!xmlText) return;
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const signs = Array.from(doc.querySelectorAll('hns_sign'));
  for (const s of signs) {
    const gloss = (s.getAttribute('gloss') || '').trim().toUpperCase();
    if (gloss.length === 1 && gloss >= 'A' && gloss <= 'Z') {
      letterToSign.set(gloss, s.outerHTML);
    }
  }
}

async function loadConceptCsvUrl(url: string) {
  let txt = await fetchText(url);
  if (!txt) return;
  if (txt.charCodeAt(0) === 0xfeff) txt = txt.slice(1);
  const delim = txt.includes('\t') ? '\t' : ',';
  const lines = txt.split(/\r?\n/).filter((l) => l.trim());
  const header = (lines.shift() || '').split(delim).map((s) => s.trim().toLowerCase());
  const ci = header.indexOf('concept');
  const gi = header.indexOf('gloss');
  if (ci < 0 || gi < 0) return;
  for (const line of lines) {
    const cols = line.split(delim);
    const concept = (cols[ci] || '').trim().toLowerCase();
    const gloss = (cols[gi] || '').trim().toLowerCase();
    if (concept && gloss) conceptToGloss.set(glossBase(concept), gloss);
  }
}

function extractEmbeddedAlphabet() {
  for (const entry of glossToSign.entries()) {
    const upper = entry[0].toUpperCase();
    if (upper.length === 1 && upper >= 'A' && upper <= 'Z' && !letterToSign.has(upper)) {
      letterToSign.set(upper, entry[1]);
    }
  }
}

/**
 * Load (or reload) the gloss→SiGML maps for a sign language. Safe to call
 * repeatedly; a language switch clears and rebuilds the maps.
 */
export async function prepare(signLanguage: SignLanguageCode): Promise<void> {
  if (_readyLang === signLanguage && glossToSign.size > 0) return;

  // Serialize concurrent prepares for the same language.
  if (_preparing) {
    await _preparing;
    if (_readyLang === signLanguage) return;
  }

  _preparing = (async () => {
    glossToSign.clear();
    letterToSign.clear();
    baseToGloss.clear();
    conceptToGloss.clear();

    const db = SIGN_LANG_DB[signLanguage];
    for (const url of db.sigml) {
      await loadSigmlUrl(url);
    }
    if (db.csv) await loadConceptCsvUrl(db.csv);
    if (db.alphabet) await loadAlphabetSigmlUrl(db.alphabet);

    extractEmbeddedAlphabet();

    if (letterToSign.size < 26) {
      await loadAlphabetSigmlUrl(FALLBACK_ALPHABET);
    }

    _readyLang = signLanguage;
  })();

  try {
    await _preparing;
  } finally {
    _preparing = null;
  }
}

export function isReady(signLanguage: SignLanguageCode): boolean {
  return _readyLang === signLanguage && glossToSign.size > 0;
}

export function glossCount(): number {
  return glossToSign.size;
}

/** Sorted list of loaded database glosses (for the Sign Library tab). */
export function listGlosses(): string[] {
  return Array.from(glossToSign.keys()).sort();
}

// ---------------------------------------------------------------------------
// Mapping & SiGML building (real Kozha `mapToAvailable` / `buildSigml`)
// ---------------------------------------------------------------------------

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/** Map raw tokens to available sign glosses; unknown tokens are fingerspelled. */
export function mapToAvailable(tokens: string[], cutoff = 0.82): { mapped: string[]; missing: string[] } {
  const mapped: string[] = [];
  const missing: string[] = [];
  if (glossToSign.size === 0) return { mapped: tokens, missing: [] };

  for (const t of tokens) {
    if (glossToSign.has(t)) {
      mapped.push(t);
      continue;
    }
    const tBase = glossBase(t);
    if (conceptToGloss.has(tBase)) {
      const g = conceptToGloss.get(tBase)!;
      if (glossToSign.has(g)) {
        mapped.push(g);
        continue;
      }
    }
    if (baseToGloss.has(tBase)) {
      const g = baseToGloss.get(tBase)!;
      if (glossToSign.has(g)) {
        mapped.push(g);
        continue;
      }
    }
    let bestBase: string | null = null;
    let bestScore = 0;
    for (const b of baseToGloss.keys()) {
      const s = similarity(tBase, b);
      if (s > bestScore) {
        bestScore = s;
        bestBase = b;
      }
    }
    if (bestBase && bestScore >= cutoff) {
      mapped.push(baseToGloss.get(bestBase)!);
      continue;
    }
    if (letterToSign.size > 0 && /[A-Za-z]/.test(t)) {
      mapped.push(t); // fingerspell below
    } else {
      missing.push(t);
    }
  }
  return { mapped, missing };
}

export function fingerspellWord(word: string): string[] {
  const blocks: string[] = [];
  for (const char of (word || '').toUpperCase()) {
    if (char >= 'A' && char <= 'Z') {
      const lb = letterToSign.get(char);
      if (lb) blocks.push(lb);
    }
  }
  return blocks;
}

/** Build a `<sigml>…</sigml>` document from gloss tokens, validating each entry. */
export function buildSigml(tokens: string[]): { sigml: string | null; malformed: string[] } {
  const blocks: string[] = [];
  const malformed: string[] = [];
  for (const t of tokens) {
    const entry = glossToSign.get(t);
    let accepted = false;
    if (typeof entry === 'string') {
      const v = validateHnsSign(entry);
      if (v.valid) {
        blocks.push(entry);
        accepted = true;
      } else {
        malformed.push(t);
        console.warn('[kozhaClient] skipping malformed sign:', t, v.unknownTags);
      }
    }
    if (!accepted && letterToSign.size > 0) {
      const lb = fingerspellWord(t);
      if (lb.length > 0) blocks.push(...lb);
    }
  }
  if (!blocks.length) return { sigml: null, malformed };
  const composed = `<?xml version="1.0" encoding="utf-8"?>\n<sigml>\n${blocks.join('\n')}\n</sigml>`;
  if (hasObjectLiteral(composed)) {
    console.error('[kozhaClient] refusing to emit: SiGML contains [object Object]');
    return { sigml: null, malformed };
  }
  return { sigml: composed, malformed };
}

// ---------------------------------------------------------------------------
// High-level: text -> glosses (Kozha client heuristic fallback)
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

export interface SequenceResult {
  tokens: string[];
  sigml: string | null;
  breakdown: SignBreakdownItem[];
  missing: string[];
}

/**
 * Translate text into a SiGML sequence using the loaded database. This is the
 * Kozha client-side heuristic used when the backend is unreachable.
 */
export async function translateLocally(text: string, signLanguage: SignLanguageCode): Promise<SequenceResult> {
  await prepare(signLanguage);
  const tokens = tokenize(text);
  const { mapped } = mapToAvailable(tokens);
  const { sigml, malformed } = buildSigml(mapped);

  const breakdown: SignBreakdownItem[] = [];
  for (const gloss of mapped) {
    const entry = glossToSign.get(gloss);
    if (entry) {
      breakdown.push({
        word: gloss,
        gloss: gloss.toUpperCase(),
        isFingerspelled: gloss.length === 1 && /[A-Za-z]/.test(gloss),
        hamnosys: undefined,
        sigml: entry,
      });
    }
  }

  return {
    tokens,
    sigml,
    breakdown,
    missing: [...malformed],
  };
}

/** Map a backend-provided gloss string (e.g. `plan.final`) into a sequence. */
export async function buildSequenceFromGlosses(
  glossLine: string,
  signLanguage: SignLanguageCode,
): Promise<SequenceResult> {
  await prepare(signLanguage);
  const rawTokens = (glossLine || '').replace(/[.\n]/g, ' ').split(/\s+/).filter(Boolean);
  const { mapped } = mapToAvailable(rawTokens);
  const { sigml, malformed } = buildSigml(mapped);

  const breakdown: SignBreakdownItem[] = [];
  for (const gloss of mapped) {
    const entry = glossToSign.get(gloss);
    if (entry) {
      breakdown.push({
        word: gloss,
        gloss: gloss.toUpperCase(),
        isFingerspelled: gloss.length === 1 && /[A-Za-z]/.test(gloss),
        hamnosys: undefined,
        sigml: entry,
      });
    }
  }

  return {
    tokens: rawTokens,
    sigml,
    breakdown,
    missing: [...malformed],
  };
}

// Re-export the container tags so any lightweight validation can reuse it.
export const _containerTags = CONTAINER_TAGS;
