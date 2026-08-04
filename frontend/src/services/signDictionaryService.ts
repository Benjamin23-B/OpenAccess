/**
 * Sign Dictionary Service
 *
 * Thin wrapper around the real Kozha pipeline:
 *   - `fetchKozhaPlan`   -> POST /api/plan (real Kozha NLP), map glosses to the
 *                           shipped `.sigml` database client-side.
 *   - `processTextToSign` -> local (offline) fallback using the same client DB.
 *
 * The destructive whitelist sanitizer is gone: database entries are used
 * verbatim (see `kozhaClient.buildSigml`, which validates rather than strips).
 */

import * as kozhaClient from './kozhaClient';
import type {
  ProcessedSignSequence,
  SignBreakdownItem,
  SignLanguageCode,
} from './kozhaClient';

// Re-export for existing importers.
export type { ProcessedSignSequence, SignBreakdownItem, SignLanguageCode } from './kozhaClient';

const LANGUAGE_CODE: Record<string, SignLanguageCode> = {
  ISL: 'isl',
  BSL: 'bsl',
  bsl: 'bsl',
  isl: 'isl',
};

function toCode(signLanguage: string): SignLanguageCode {
  return LANGUAGE_CODE[signLanguage] || 'isl';
}

function toSequence(result: kozhaClient.SequenceResult, plannerSource: string): ProcessedSignSequence {
  return {
    tokens: result.tokens,
    sigmlSequence: result.sigml || '',
    signBreakdown: result.breakdown,
    facialExpression: 'neutral',
    plannerSource,
  };
}

class SignDictionaryService {
  /** Ensure a sign language's database maps are loaded. */
  public async prepare(signLanguage: string): Promise<void> {
    await kozhaClient.prepare(toCode(signLanguage));
  }

  /**
   * Fetch the real Kozha NLP plan from the microservice (port 8001), then map
   * the returned gloss string onto the client-side database. Falls back to the
   * local Kozha heuristic if the server is unreachable.
   */
  public async fetchKozhaPlan(
    text: string,
    signLanguage: string = 'ISL',
  ): Promise<ProcessedSignSequence> {
    if (!text || !text.trim()) {
      return { tokens: [], sigmlSequence: '', signBreakdown: [] };
    }

    const code = toCode(signLanguage);

    try {
      const response = await fetch('http://localhost:8001/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'en', sign_language: code }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.final === 'string') {
          const result = await kozhaClient.buildSequenceFromGlosses(data.final, code);
          return toSequence(result, 'KOZHA_SERVER');
        }
      }
    } catch (err) {
      console.warn('Kozha SL Engine server offline, using local fallback:', err);
    }

    return this.processTextToSign(text, signLanguage);
  }

  /**
   * Synchronous→async local translation using the real Kozha client database
   * (offline fallback path).
   */
  public async processTextToSign(text: string, language: string = 'ISL'): Promise<ProcessedSignSequence> {
    if (!text || !text.trim()) {
      return { tokens: [], sigmlSequence: '', signBreakdown: [] };
    }
    const result = await kozhaClient.translateLocally(text, toCode(language));
    return toSequence(result, 'LOCAL_KOZHA_DB');
  }

  /**
   * Search the loaded sign database for the Sign Library tab. Falls back to an
   * empty list when no database has been prepared yet.
   */
  public searchEntries(query: string = '', category: string = 'All'): { id: string; gloss: string; category: string; movement: string; location: string; language: string }[] {
    const glosses = kozhaClient.listGlosses();
    const q = query.trim().toLowerCase();
    return glosses
      .filter((g) => {
        if (category !== 'All') return false;
        return !q || g.toLowerCase().includes(q) || g.toUpperCase().includes(q.toUpperCase());
      })
      .slice(0, 200)
      .map((g) => ({
        id: `db-${g}`,
        gloss: g.toUpperCase(),
        category: 'General',
        movement: 'Database sign (HamNoSys)',
        location: '—',
        language: g,
      }));
  }
}

export const signDictionaryService = new SignDictionaryService();
