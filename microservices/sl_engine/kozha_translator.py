"""
Kozha Speech & Text to 3D Sign Language Translation Engine
Integrated for Niral Thiruvizha Deaf / HoH Assistive Bridge.
"""
import os
import re
import json
import logging
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from collections import OrderedDict
from threading import Lock

logger = logging.getLogger(__name__)

SL_ENGINE_DIR = Path(__file__).resolve().parent
DATA_DIR = SL_ENGINE_DIR / "data"
ABBREV_FILE = SL_ENGINE_DIR / "abbreviations.json"

# Load Abbreviations
ABBREVIATIONS: Dict[str, str] = {}
if ABBREV_FILE.exists():
    try:
        with ABBREV_FILE.open("r", encoding="utf-8") as f:
            raw = json.load(f)
            ABBREVIATIONS = {k.strip().lower(): v.strip().lower() for k, v in raw.items()}
    except Exception as e:
        logger.warning(f"Could not load abbreviations: {e}")
ABBREV_VALUES = {v for v in ABBREVIATIONS.values()}

# Global spaCy model cache
_spacy_loaded = False
_nlp_en = None

def get_spacy_nlp():
    global _spacy_loaded, _nlp_en
    if not _spacy_loaded:
        try:
            import spacy
            try:
                _nlp_en = spacy.load("en_core_web_sm", disable=["ner"])
            except OSError:
                _nlp_en = spacy.blank("en")
                if "sentencizer" not in _nlp_en.pipe_names:
                    _nlp_en.add_pipe("sentencizer")
        except Exception as e:
            logger.warning(f"spaCy loading warning: {e}")
            _nlp_en = None
        _spacy_loaded = True
    return _nlp_en

STOPWORDS = {
    "en": {
        "a", "an", "the", "and", "or", "but", "if", "then", "than",
        "of", "to", "in", "on", "at", "for", "from", "with", "as", "by", "is", "are", "am",
        "be", "been", "was", "were", "do", "does", "did", "it", "that", "this", "those", "these",
    }
}
STOPWORDS["default"] = STOPWORDS["en"]

TIME_WORDS = {
    "en": {
        "today", "yesterday", "tomorrow", "morning", "afternoon", "evening", "night", "tonight",
        "now", "later", "soon", "week", "month", "year",
        "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
        "january", "february", "march", "april", "may", "june", "july",
        "august", "september", "october", "november", "december",
        "last", "next", "ago", "previous", "following", "always", "never", "sometimes", "often", "usually",
        "recently", "early", "late", "past", "future", "present", "daily", "weekly", "monthly", "yearly",
        "already", "still", "yet", "before", "after", "weekend", "midday"
    }
}
TIME_WORDS["default"] = TIME_WORDS["en"]

GREETING_STARTERS = {"good", "nice", "happy", "merry"}

PRONOUNS = {
    "en": {
        "keep": {"you", "we", "they", "them", "us", "my", "your", "our", "their", "not"},
        "normalize": {
            "i": "me", "me": "me",
            "he": "he", "him": "he", "she": "he", "it": "he",
            "her": "he", "his": "his", "its": "his",
            "n't": "not",
        },
    }
}
PRONOUNS["default"] = PRONOUNS["en"]

QUESTION_WORDS = {"what", "where", "when", "who", "why", "how", "which"}

GRAMMAR_PROFILES = {
    "bsl":      {"verb_final": False, "time_first": True},
    "asl":      {"verb_final": False, "time_first": True},
    "dgs":      {"verb_final": True,  "time_first": True},
    "lsf":      {"verb_final": True,  "time_first": True},
    "isl":      {"verb_final": False, "time_first": True},
}
DEFAULT_GRAMMAR = {"verb_final": False, "time_first": True}

# Cached SiGML / CSV Gloss maps
_GLOSS_CACHE: Dict[str, Dict[str, str]] = {}

def get_sign_database(sign_lang: str) -> Dict[str, str]:
    lang_key = sign_lang.lower().strip()
    if lang_key in _GLOSS_CACHE:
        return _GLOSS_CACHE[lang_key]

    db: Dict[str, str] = {}
    
    # Check corresponding SIGML files in DATA_DIR
    sigml_file_map = {
        "isl": ["Indian_SL.sigml"],
        "asl": ["American_SL_ASL.sigml", "asl_alphabet_sigml.sigml"],
        "bsl": ["hamnosys_bsl_version1.sigml", "bsl_alphabet_sigml.sigml"],
        "dgs": ["German_SL_DGS.sigml", "dgs_alphabet_sigml.sigml"],
        "lsf": ["French_SL_LSF.sigml", "lsf_alphabet_sigml.sigml"],
    }

    files_to_check = sigml_file_map.get(lang_key, [f"{lang_key}.sigml"])
    # Always include fallbacks
    files_to_check.append("Indian_SL.sigml")
    files_to_check.append("asl_alphabet_sigml.sigml")

    for fname in files_to_check:
        fpath = DATA_DIR / fname
        if not fpath.exists():
            continue
        try:
            tree = ET.parse(fpath)
            root = tree.getroot()
            for child in root:
                if child.tag == "hns_sign":
                    gloss = child.attrib.get("gloss", "").strip().lower()
                    if gloss:
                        sigml_str = ET.tostring(child, encoding="utf-8").decode("utf-8")
                        if gloss not in db:
                            db[gloss] = sigml_str
        except Exception as e:
            logger.warning(f"Error parsing SiGML file {fname}: {e}")

    # Check CSV files (e.g. hamnosys_bsl.csv)
    csv_fname = f"hamnosys_{lang_key}.csv"
    csv_path = DATA_DIR / csv_fname
    if csv_path.exists():
        try:
            import csv
            with csv_path.open("r", encoding="utf-8") as f:
                reader = csv.reader(f)
                for row in reader:
                    if len(row) >= 2:
                        word = row[0].strip().lower()
                        ham = row[1].strip()
                        if word and word not in db and ham:
                            db[word] = f'<hns_sign gloss="{word.upper()}"><hamnosys_manual>{ham}</hamnosys_manual></hns_sign>'
        except Exception as e:
            logger.warning(f"Error parsing CSV file {csv_fname}: {e}")

    _GLOSS_CACHE[lang_key] = db
    return db


def reorder_tokens(tokens_with_pos: List[Tuple[str, str]], sign_language: str) -> List[str]:
    grammar = GRAMMAR_PROFILES.get(sign_language.lower(), DEFAULT_GRAMMAR)
    time_words = TIME_WORDS["en"]
    question_words = QUESTION_WORDS
    greeting_starters = GREETING_STARTERS

    locked_time_indices: Set[int] = set()
    for i, (text, _pos) in enumerate(tokens_with_pos):
        if text not in time_words:
            continue
        for k in range(1, 3):
            j = i - k
            if j >= 0 and tokens_with_pos[j][0] in greeting_starters:
                locked_time_indices.add(i)
                break

    time_tokens = []
    verb_tokens = []
    question_tokens = []
    other_tokens = []

    for i, (text, pos) in enumerate(tokens_with_pos):
        if text in time_words and i not in locked_time_indices:
            time_tokens.append(text)
        elif text in question_words:
            question_tokens.append(text)
        elif pos == "VERB" and grammar["verb_final"]:
            verb_tokens.append(text)
        else:
            other_tokens.append(text)

    result = []
    if grammar["time_first"]:
        result.extend(time_tokens)
    else:
        other_tokens = time_tokens + other_tokens

    result.extend(other_tokens)
    if grammar["verb_final"]:
        result.extend(verb_tokens)
    result.extend(question_tokens)
    return result


def process_text_to_gloss_list(text: str, language: str = "en", sign_language: str = "isl") -> List[str]:
    text = (text or "").strip()
    if not text:
        return []

    nlp = get_spacy_nlp()
    stopwords = STOPWORDS.get(language, STOPWORDS["default"])

    if nlp is not None:
        doc = nlp(text)
        tokens_with_pos = []
        for token in doc:
            t_lower = token.text.lower()
            if not t_lower.isalnum():
                continue
            if t_lower in stopwords:
                continue
            pos = token.pos_
            lemma = token.lemma_.lower() if pos == "VERB" else t_lower
            tokens_with_pos.append((lemma, pos))
        
        reordered = reorder_tokens(tokens_with_pos, sign_language)
        return reordered
    else:
        clean_words = re.findall(r"\b\w+\b", text.lower())
        filtered = [w for w in clean_words if w not in stopwords]
        return filtered


def plan_from_text(text: str, language: str = "en", sign_language: str = "isl") -> Dict[str, object]:
    glosses = process_text_to_gloss_list(text, language=language, sign_language=sign_language)
    db = get_sign_database(sign_language)

    sign_breakdown = []
    sigml_blocks = []

    for gloss in glosses:
        match_sigml = db.get(gloss)
        if match_sigml:
            sign_breakdown.append({
                "word": gloss,
                "gloss": gloss.upper(),
                "isFingerspelled": False,
                "sigml": match_sigml
            })
            sigml_blocks.append(match_sigml)
        else:
            asl_db = get_sign_database("asl")
            char_blocks = []
            for ch in gloss:
                ch_match = db.get(ch) or asl_db.get(ch)
                if ch_match:
                    char_blocks.append(ch_match)
                    sign_breakdown.append({
                        "word": ch.upper(),
                        "gloss": f"LETTER: {ch.upper()}",
                        "isFingerspelled": True,
                        "sigml": ch_match
                    })
            if char_blocks:
                sigml_blocks.extend(char_blocks)

    full_sigml = f'<?xml version="1.0" encoding="utf-8"?>\n<sigml>\n' + "\n".join(sigml_blocks) + "\n</sigml>"

    return {
        "raw": text,
        "final": " ".join(glosses),
        "glosses": glosses,
        "language": language,
        "sign_language": sign_language,
        "sigml": full_sigml,
        "signBreakdown": sign_breakdown,
    }
