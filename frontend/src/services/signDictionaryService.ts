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

const CURATED_SIGN_CATALOG: { gloss: string; category: string; movement: string; location: string }[] = [
  // Greetings
  { gloss: 'NAMASTE', category: 'Greetings', movement: 'Palms joined at chest level, slight head nod', location: 'Chest' },
  { gloss: 'HELLO', category: 'Greetings', movement: 'Open palm wave near temple', location: 'Head' },
  { gloss: 'GOOD MORNING', category: 'Greetings', movement: 'Flat hand move from chin down to open palm', location: 'Face / Chest' },
  { gloss: 'GOOD EVENING', category: 'Greetings', movement: 'Flat hand arching down over wrist', location: 'Chest' },
  { gloss: 'WELCOME', category: 'Greetings', movement: 'Open palm sweeping toward body', location: 'Chest' },
  { gloss: 'THANK YOU', category: 'Greetings', movement: 'Fingertips from chin outward', location: 'Chin' },
  { gloss: 'NICE TO MEET YOU', category: 'Greetings', movement: 'Index fingers meeting in center', location: 'Neutral Space' },
  { gloss: 'GOODBYE', category: 'Greetings', movement: 'Open hand wave side to side', location: 'Neutral Space' },

  // Emergency & Safety
  { gloss: 'HELP', category: 'Emergency', movement: 'Fist on open palm pushing upward', location: 'Chest' },
  { gloss: 'EMERGENCY', category: 'Emergency', movement: 'E-hand shape shaking rapidly', location: 'Neutral Space' },
  { gloss: 'DOCTOR', category: 'Emergency', movement: 'Tap fingertips on wrist pulse', location: 'Wrist' },
  { gloss: 'HOSPITAL', category: 'Emergency', movement: 'Draw H cross on upper arm', location: 'Upper Arm' },
  { gloss: 'POLICE', category: 'Emergency', movement: 'C-shape hand over left chest badge area', location: 'Chest' },
  { gloss: 'FIRE', category: 'Emergency', movement: 'Wiggling fingers moving upward', location: 'Chest' },
  { gloss: 'DANGER', category: 'Emergency', movement: 'Fist tapping palm with warning motion', location: 'Neutral Space' },
  { gloss: 'AMBULANCE', category: 'Emergency', movement: 'Flashing light twist motion above head', location: 'Head' },
  { gloss: 'ACCIDENT', category: 'Emergency', movement: 'Fists colliding together in center', location: 'Chest' },

  // Medical & Health
  { gloss: 'PAIN', category: 'Medical', movement: 'Index fingers pointing together twisting', location: 'Chest / Affected area' },
  { gloss: 'MEDICINE', category: 'Medical', movement: 'Middle finger tapping palm in circular motion', location: 'Palm' },
  { gloss: 'FEVER', category: 'Medical', movement: 'Back of hand touching forehead', location: 'Forehead' },
  { gloss: 'BLOOD', category: 'Medical', movement: 'Red sign followed by trickling fingers down hand', location: 'Chest' },
  { gloss: 'SICK', category: 'Medical', movement: 'Middle finger to forehead and stomach', location: 'Head / Stomach' },
  { gloss: 'BREATHE', category: 'Medical', movement: 'Palms moving in and out from chest', location: 'Chest' },
  { gloss: 'NURSE', category: 'Medical', movement: 'N-hand shape tapping wrist pulse', location: 'Wrist' },
  { gloss: 'CLINIC', category: 'Medical', movement: 'C-hand shape cross on arm', location: 'Arm' },

  // Essentials & Courtesy
  { gloss: 'PLEASE', category: 'Essentials', movement: 'Open palm circular motion on chest', location: 'Chest' },
  { gloss: 'SORRY', category: 'Essentials', movement: 'S-fist circular motion over heart', location: 'Chest' },
  { gloss: 'EXCUSE ME', category: 'Essentials', movement: 'Fingertips brushing across open palm', location: 'Hand' },
  { gloss: 'YES', category: 'Essentials', movement: 'S-fist nodding up and down', location: 'Neutral Space' },
  { gloss: 'NO', category: 'Essentials', movement: 'Index and middle finger snapping to thumb', location: 'Neutral Space' },
  { gloss: 'WATER', category: 'Essentials', movement: 'W-hand shape tapping chin', location: 'Chin' },
  { gloss: 'FOOD', category: 'Essentials', movement: 'Tapered hand tapping mouth', location: 'Mouth' },
  { gloss: 'BATHROOM', category: 'Essentials', movement: 'T-hand shape shaking side to side', location: 'Neutral Space' },
  { gloss: 'SLEEP', category: 'Essentials', movement: 'Open hand closing down over face', location: 'Face' },
  { gloss: 'EAT', category: 'Essentials', movement: 'Fingertips brought to mouth twice', location: 'Mouth' },
  { gloss: 'DRINK', category: 'Essentials', movement: 'C-hand shape brought to mouth as cup', location: 'Mouth' },

  // Questions & Communication
  { gloss: 'WHAT', category: 'Questions', movement: 'Open palms turned up, shaking side to side', location: 'Neutral Space' },
  { gloss: 'WHERE', category: 'Questions', movement: 'Index finger upright shaking side to side', location: 'Neutral Space' },
  { gloss: 'WHEN', category: 'Questions', movement: 'Index finger circling around other index finger', location: 'Neutral Space' },
  { gloss: 'WHY', category: 'Questions', movement: 'Touch forehead and pull down into Y-hand', location: 'Head' },
  { gloss: 'WHO', category: 'Questions', movement: 'Thumb to chin, index finger wiggling', location: 'Chin' },
  { gloss: 'HOW', category: 'Questions', movement: 'Curved hands roll outward facing up', location: 'Neutral Space' },
  { gloss: 'SIGN', category: 'Questions', movement: 'Index fingers circling each other backwards', location: 'Chest' },
  { gloss: 'SPEAK', category: 'Questions', movement: '4-fingers tapping chin in talking motion', location: 'Chin' },
  { gloss: 'UNDERSTAND', category: 'Questions', movement: 'Index finger flicking up near temple', location: 'Head' },
  { gloss: 'SLOW', category: 'Questions', movement: 'Hand sliding slowly up back of opposite arm', location: 'Arm' },

  // Family & People
  { gloss: 'FAMILY', category: 'Family', movement: 'F-hands starting together and circling outward', location: 'Chest' },
  { gloss: 'MOTHER', category: 'Family', movement: 'Open 5-hand thumb tapping chin', location: 'Chin' },
  { gloss: 'FATHER', category: 'Family', movement: 'Open 5-hand thumb tapping forehead', location: 'Forehead' },
  { gloss: 'SON', category: 'Family', movement: 'Male sign (forehead) to baby cradle motion', location: 'Chest' },
  { gloss: 'DAUGHTER', category: 'Family', movement: 'Female sign (chin) to baby cradle motion', location: 'Chest' },
  { gloss: 'FRIEND', category: 'Family', movement: 'Hooked index fingers interlocking twice', location: 'Hands' },
  { gloss: 'BABY', category: 'Family', movement: 'Arms crossed cradling baby side to side', location: 'Chest' },
  { gloss: 'MAN', category: 'Family', movement: 'Thumb to forehead moving down to chest', location: 'Head / Chest' },
  { gloss: 'WOMAN', category: 'Family', movement: 'Thumb to chin moving down to chest', location: 'Chin / Chest' },
  { gloss: 'TEACHER', category: 'Family', movement: 'Flat hands from forehead outward + person sign', location: 'Head' },

  // Time & Days
  { gloss: 'TODAY', category: 'Time', movement: 'Y-hands moving down twice in front', location: 'Chest' },
  { gloss: 'TOMORROW', category: 'Time', movement: 'Thumb arc forward from cheek', location: 'Cheek' },
  { gloss: 'YESTERDAY', category: 'Time', movement: 'Thumb arc backward from chin to ear', location: 'Cheek' },
  { gloss: 'NOW', category: 'Time', movement: 'Y-hands dropping down firmly once', location: 'Chest' },
  { gloss: 'MORNING', category: 'Time', movement: 'Hand rising up under opposite arm like sun', location: 'Arm' },
  { gloss: 'NIGHT', category: 'Time', movement: 'Curved hand arching over arm like setting sun', location: 'Arm' },
  { gloss: 'DAY', category: 'Time', movement: 'Index arm swinging down onto flat arm', location: 'Arm' },
  { gloss: 'WEEK', category: 'Time', movement: 'Index finger sliding across flat palm', location: 'Palm' },
  { gloss: 'TIME', category: 'Time', movement: 'Index finger tapping wrist watch location', location: 'Wrist' },

  // Numbers
  { gloss: 'ONE', category: 'Numbers', movement: 'Index finger raised facing palm', location: 'Hand' },
  { gloss: 'TWO', category: 'Numbers', movement: 'Index and middle finger raised', location: 'Hand' },
  { gloss: 'THREE', category: 'Numbers', movement: 'Thumb, index, and middle finger raised', location: 'Hand' },
  { gloss: 'FOUR', category: 'Numbers', movement: 'Four fingers raised', location: 'Hand' },
  { gloss: 'FIVE', category: 'Numbers', movement: 'Open 5-hand raised', location: 'Hand' },
  { gloss: 'SIX', category: 'Numbers', movement: 'Pinky finger touching thumb', location: 'Hand' },
  { gloss: 'SEVEN', category: 'Numbers', movement: 'Ring finger touching thumb', location: 'Hand' },
  { gloss: 'EIGHT', category: 'Numbers', movement: 'Middle finger touching thumb', location: 'Hand' },
  { gloss: 'NINE', category: 'Numbers', movement: 'Index finger touching thumb', location: 'Hand' },
  { gloss: 'TEN', category: 'Numbers', movement: '10-hand thumb shaking side to side', location: 'Hand' },
];

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
      const response = await fetch('/api/plan', {
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
   * Search the loaded sign database and curated catalog for the Sign Library tab.
   */
  public searchEntries(query: string = '', category: string = 'All'): { id: string; gloss: string; category: string; movement: string; location: string; language: string }[] {
    const q = query.trim().toLowerCase();
    
    // 1. Filter curated catalog
    const curatedFiltered = CURATED_SIGN_CATALOG.filter((item) => {
      const matchCat = category === 'All' || item.category === category;
      const matchQuery = !q || item.gloss.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.movement.toLowerCase().includes(q);
      return matchCat && matchQuery;
    }).map((item) => ({
      id: `curated-${item.gloss}`,
      gloss: item.gloss,
      category: item.category,
      movement: item.movement,
      location: item.location,
      language: 'en',
    }));

    // 2. Filter DB glosses loaded from Kozha
    const dbGlosses = kozhaClient.listGlosses();
    const curatedGlossesSet = new Set(CURATED_SIGN_CATALOG.map(c => c.gloss.toLowerCase()));
    
    const dbFiltered = dbGlosses
      .filter((g) => {
        if (category !== 'All' && category !== 'Database Signs') return false;
        if (curatedGlossesSet.has(g.toLowerCase())) return false; // avoid duplicate
        return !q || g.toLowerCase().includes(q);
      })
      .slice(0, 300)
      .map((g) => ({
        id: `db-${g}`,
        gloss: g.toUpperCase(),
        category: 'Database Signs',
        movement: 'Database Sign (HamNoSys)',
        location: '3D Mesh',
        language: g,
      }));

    return [...curatedFiltered, ...dbFiltered];
  }
}

export const signDictionaryService = new SignDictionaryService();
