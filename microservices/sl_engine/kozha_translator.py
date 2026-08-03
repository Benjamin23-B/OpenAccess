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

try:
    from microservices.sl_engine.ai_sign_wrapper import translate_text_with_ai
except ImportError:
    from ai_sign_wrapper import translate_text_with_ai

COMMON_PHRASES = {
    "thank you": "thanks",
    "thank-you": "thanks",
    "good morning": "morning",
    "good afternoon": "afternoon",
    "good evening": "evening",
    "good night": "night",
    "how are you": "how you",
    "what is your name": "you name what",
}

SYNONYMS = {
    "doctors": "doctor",
    "physician": "doctor",
    "hospitals": "hospital",
    "eating": "eat",
    "foods": "food",
    "helping": "help",
    "helped": "help",
    "thanks": "thanks",
    "thankyou": "thanks",
    "hi": "hello",
    "hey": "hello",
}

VALID_HAMNOSYS_TOKENS = {
    'hamtab', 'hamlinefeed', 'hampagebreak', 'hamreturn', 'hamversion40', 'hamspace', 'hamexclaim', 'hamquery',
    'hamfullstop', 'hamcomma', 'hamplus', 'hammetaalt', 'hamclocku', 'hamclockul', 'hamclockl', 'hamclockdl',
    'hamclockd', 'hamclockdr', 'hamclockr', 'hamclockur', 'hamclockfull', 'hamsymmpar', 'hamsymmlr', 'hamfist',
    'hamflathand', 'hamfinger2', 'hamfinger23', 'hamfinger23spread', 'hamfinger2345', 'hamthumboutmod',
    'hamthumbacrossmod', 'hampinch12', 'hampinchall', 'hampinch12open', 'hamcee12', 'hamceeall', 'hamcee12open',
    'hamthumbopenmod', 'hamfingerstraightmod', 'hamfingerbendmod', 'hamfingerhookedmod', 'hamnondominant',
    'hamdoublebent', 'hamdoublehooked', 'hamextfingeru', 'hamextfingerur', 'hamextfingerr', 'hamextfingerdr',
    'hamextfingerd', 'hamextfingerdl', 'hamextfingerl', 'hamextfingerul', 'hamextfingerol', 'hamextfingero',
    'hamextfingeror', 'hamextfingeril', 'hamextfingeri', 'hamextfingerir', 'hamextfingerui', 'hamextfingerdi',
    'hamextfingerdo', 'hamextfingeruo', 'hamearlobe', 'hamnostrils', 'hamshouldertop', 'hampalmu', 'hampalmur',
    'hampalmr', 'hampalmdr', 'hampalmd', 'hampalmdl', 'hampalml', 'hampalmul', 'hamreplace', 'hamarmextended',
    'hambehind', 'hametc', 'hamorirelative', 'hamtongue', 'hamteeth', 'hamstomach', 'hamneutralspace', 'hamhead',
    'hamheadtop', 'hamforehead', 'hameyebrows', 'hameyes', 'hamnose', 'hamear', 'hamcheek', 'hamlips', 'hamchin',
    'hamunderchin', 'hamneck', 'hamshoulders', 'hamchest', 'hambelowstomach', 'hamlrbeside', 'hamlrat', 'hamupperarm',
    'hamelbow', 'hamelbowinside', 'hamlowerarm', 'hamwristback', 'hamwristpulse', 'hamthumbball', 'hampalm',
    'hamhandback', 'hamthumb', 'hamindexfinger', 'hammiddlefinger', 'hamringfinger', 'hampinky', 'hamthumbside',
    'hampinkyside', 'hambetween', 'hamfingertip', 'hamfingernail', 'hamfingerpad', 'hamfingermidjoint', 'hamfingerbase',
    'hamfingerside', 'hamwristtopulse', 'hamwristtoback', 'hamwristtothumb', 'hamwristtopinky', 'hamcoreftag',
    'hamcorefref', 'hamnomotion', 'hammoveu', 'hammoveur', 'hammover', 'hammovedr', 'hammoved', 'hammovedl',
    'hammovel', 'hammoveul', 'hammoveol', 'hammoveo', 'hammoveor', 'hammoveil', 'hammovei', 'hammoveir',
    'hammoveui', 'hammovedi', 'hammovedo', 'hammoveuo', 'hammovecross', 'hammovex', 'hamsmallmod', 'hamlargemod',
    'hamarcl', 'hamarcu', 'hamarcr', 'hamarcd', 'hamwavy', 'hamzigzag', 'hamfingerplay', 'hamparbegin', 'hamparend',
    'hamcircleo', 'hamcirclei', 'hamcircled', 'hamcircleu', 'hamcirclel', 'hamcircler', 'hamincreasing',
    'hamdecreasing', 'hamclose', 'hamtouch', 'haminterlock', 'hamcross', 'hamfast', 'hamslow', 'hamtense',
    'hamrest', 'hamhalt', 'hamrepeatfromstart', 'hamrepeatfromstartseveral', 'hamrepeatcontinue',
    'hamrepeatcontinueseveral', 'hamseqbegin', 'hamseqend', 'hamalternatingmotion', 'hamrepeatreverse',
    'hambrushing', 'hamnonipsi', 'hamellipseh', 'hamellipseur', 'hamellipsev', 'hamellipseul', 'hammime',
    'hamaltbegin', 'hamaltend', 'hamnodding', 'hamswinging', 'hamtwisting', 'hamstircw', 'hamstirccw',
    'hamfusionbegin', 'hamfusionend', 'hamcircleul', 'hamcircledr', 'hamcircleur', 'hamcircledl', 'hamcircleol',
    'hamcircleir', 'hamcircleor', 'hamcircleil', 'hamcircledo', 'hamcircleui', 'hamcircledi', 'hamcircleuo'
}

def sanitize_sigml(sigml: str) -> str:
    if not sigml:
        return sigml

    # Token corrections
    sigml = re.sub(r'\bhamcircle\b', 'hamcirclei', sigml, flags=re.IGNORECASE)
    sigml = re.sub(r'\bhamwrist\b', 'hamwristback', sigml, flags=re.IGNORECASE)
    sigml = re.sub(r'\bhamfinger345\b', 'hamfinger2345', sigml, flags=re.IGNORECASE)

    # Lowercase all HamNoSys tokens and tags
    sigml = re.sub(r'\b(ham[a-zA-Z0-9_]*)\b', lambda m: m.group(1).lower(), sigml, flags=re.IGNORECASE)

    # Convert plain space-separated text tokens to self-closing XML tags if not already XML tags
    sigml = re.sub(r'(^|>|\s)(ham[a-z0-9_]+)(?=$|<|\s)', r'\1<\2/>', sigml)

    # Clean double initial handshape at start of <hamnosys_manual>
    sigml = re.sub(
        r'(<hamnosys_manual\s*>)\s*<hamflathand\s*\/?>\s*(<ham(?:finger|fist|pinch|cee)[a-z0-9_]*\s*\/?>)',
        r'\1\2',
        sigml,
        flags=re.IGNORECASE
    )

    # Clean orphan or invalid <hamreplace/> tags or bare hamreplace tags
    sigml = re.sub(r'(<hamparbegin\s*\/?>\s*)<hamreplace\s*\/?>', r'\1', sigml, flags=re.IGNORECASE)
    sigml = re.sub(r'<hamreplace\s*\/?>\s*(?=<hamparend\s*\/?>)', '', sigml, flags=re.IGNORECASE)
    sigml = re.sub(r'<hamreplace\s*\/?>\s*(?=\s*<\/hamnosys_manual>)', '', sigml, flags=re.IGNORECASE)
    sigml = re.sub(r'<hamreplace\s*\/?>', '', sigml, flags=re.IGNORECASE)

    # Clean duplicate hamsplit tags
    sigml = re.sub(r'(?:<hamsplit\/>\s*)+', r'<hamsplit/>', sigml, flags=re.IGNORECASE)

    # Clean bare <hamplus/> outside <hamparbegin>
    if '<hamparbegin' not in sigml.lower():
        sigml = re.sub(r'<hamplus\s*\/?>', '', sigml, flags=re.IGNORECASE)

    # Insert <hamsplit/> between two consecutive handshapes if missing
    if '<hamsplit/>' not in sigml:
        sigml = re.sub(r'(<hamfist\/>)\s*(<hamflathand\/>)', r'<hamsplit/>\1\2', sigml, flags=re.IGNORECASE)

    # Swap thumb modifier placed before extension direction
    sigml = re.sub(
        r'(<(?:hamthumboutmod|hamthumbacrossmod|hamthumbopenmod)\s*\/?>\s*)(<hamextfinger[a-z0-9]+\s*\/?>)',
        r'\2\1',
        sigml,
        flags=re.IGNORECASE
    )

    # Prepend default initial handshape if manual sequence begins without a valid initial handshape
    sigml = re.sub(
        r'(<hamnosys_manual\s*>)(?=\s*<(?:hamextfinger|hampalm|hamchest|hamshoulders|hamchin|hamforehead|hamhead|hamface|hamunderchin|hamneck|hamwrist|hamtouch|hammove|hamcircle)[a-z0-9_]*\s*\/?>)',
        r'\1<hamflathand/>',
        sigml,
        flags=re.IGNORECASE
    )

    # Strip invalid finger/pad AST tokens that trigger HamFingertip parser errors
    sigml = re.sub(
        r'<(?:hammiddlefinger|hamringfinger|hampinky|hamthumb|hamindexfinger|hamfingerpad|hamfingertip|hamfingernail|hamfingermidjoint|hamfingerbase|hamfingerside)\s*\/?>',
        '',
        sigml,
        flags=re.IGNORECASE
    )

    STRUCTURAL_TAGS = {'hamnosys_manual', 'hamnosys_nonmanual', 'hns_sign', 'sigml', 'hnms_sign', 'hns_motion', 'hns_handshape'}
    
    ALIAS_MAP = {
        'fingerhookmod': 'hamfingerhookedmod',
        'split': 'hamsplit',
        'finger1': 'hamfinger1',
        'palmo': 'hampalmo',
        'ceeopen': 'hamceeallopen',
        'finger234': 'hamfinger2345',
        'hamfinger234': 'hamfinger2345',
        'finger345': 'hamfinger2345',
        'hamfinger345': 'hamfinger2345',
    }

    # Strip any unrecognized <ham.../> XML element not present in VALID_HAMNOSYS_TOKENS or STRUCTURAL_TAGS
    def validate_tag(m):
        full_tag = m.group(0)
        tname = m.group(1).lower()
        full_tname = f"ham{tname}"
        if full_tname in STRUCTURAL_TAGS or tname in STRUCTURAL_TAGS:
            return full_tag
        if tname in ALIAS_MAP:
            return f"<{ALIAS_MAP[tname]}/>"
        if full_tname in ALIAS_MAP:
            return f"<{ALIAS_MAP[full_tname]}/>"
        if full_tname in VALID_HAMNOSYS_TOKENS:
            return f"<{full_tname}/>"
        if tname in VALID_HAMNOSYS_TOKENS:
            return f"<{tname}/>"
        logger.warning(f"[Python Sanitizer] Stripping unknown HamNoSys token: <{tname}/>")
        return ""

    sigml = re.sub(r'<ham([a-z0-9_]+)\s*\/?>', validate_tag, sigml, flags=re.IGNORECASE)

    # Clean inter-tag whitespace
    sigml = re.sub(r'>\s+<', '><', sigml)

    return sigml.strip()


def get_sign_database(sign_lang: str) -> Dict[str, str]:
    lang_key = sign_lang.lower().strip()
    if lang_key in _GLOSS_CACHE:
        return _GLOSS_CACHE[lang_key]

    db: Dict[str, str] = {}

    # Built-in high-priority dictionary for core signs
    builtin_signs = {
        "help": '<hns_sign gloss="HELP"><hamnosys_manual><hamsymmlr/><hamsplit/><hamfist/><hamflathand/><hamextfingeru/><hampalmu/><hamneutralspace/><hammoveu/></hamnosys_manual></hns_sign>',
        "hello": '<hns_sign gloss="HELLO"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalmd/><hamforehead/><hamlrat/><hammover/></hamnosys_manual></hns_sign>',
        "hi": '<hns_sign gloss="HI"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalmd/><hamshoulders/><hammover/></hamnosys_manual></hns_sign>',
        "namaste": '<hns_sign gloss="NAMASTE"><hamnosys_manual><hamsymmlr/><hamflathand/><hamextfingeru/><hampalml/><hamchest/><hamtouch/></hamnosys_manual></hns_sign>',
        "thanks": '<hns_sign gloss="THANK-YOU"><hamnosys_manual><hamflathand/><hamthumboutmod/><hamextfingeru/><hambetween/><hamextfingerul/><hampalml/><hamunderchin/><hamseqbegin/><hamtouch/><hamfingerpad/><hamseqend/><hamparbegin/><hammovedo/><hamsmallmod/><hamparend/></hamnosys_manual></hns_sign>',
        "thankyou": '<hns_sign gloss="THANK-YOU"><hamnosys_manual><hamflathand/><hamthumboutmod/><hamextfingeru/><hambetween/><hamextfingerul/><hampalml/><hamunderchin/><hamseqbegin/><hamtouch/><hamfingerpad/><hamseqend/><hamparbegin/><hammovedo/><hamsmallmod/><hamparend/></hamnosys_manual></hns_sign>',
        "please": '<hns_sign gloss="PLEASE"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamchest/><hamcirclei/></hamnosys_manual></hns_sign>',
        "sorry": '<hns_sign gloss="SORRY"><hamnosys_manual><hamfist/><hamthumboutmod/><hamextfingeru/><hampalml/><hamchest/><hamcirclei/></hamnosys_manual></hns_sign>',
        "doctor": '<hns_sign gloss="DOCTOR"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamwristback/><hamtouch/></hamnosys_manual></hns_sign>',
        "hospital": '<hns_sign gloss="HOSPITAL"><hamnosys_manual><hamfinger23/><hamextfingeru/><hampalml/><hamupperarm/><hammoved/></hamnosys_manual></hns_sign>',
        "danger": '<hns_sign gloss="DANGER"><hamnosys_manual><hamfist/><hamextfingeru/><hampalml/><hamchest/><hammoveu/></hamnosys_manual></hns_sign>',
        "safe": '<hns_sign gloss="SAFE"><hamnosys_manual><hamsymmlr/><hamfist/><hamextfingeru/><hampalml/><hamchest/><hammover/></hamnosys_manual></hns_sign>',
        "what": '<hns_sign gloss="WHAT"><hamnosys_manual><hamsymmlr/><hamflathand/><hamextfingero/><hampalmu/><hamchest/><hammover/></hamnosys_manual></hns_sign>',
        "where": '<hns_sign gloss="WHERE"><hamnosys_manual><hamfinger1/><hamextfingeru/><hampalmo/><hamshoulders/><hammover/></hamnosys_manual></hns_sign>',
        "who": '<hns_sign gloss="WHO"><hamnosys_manual><hamfinger1/><hamextfingeru/><hampalmo/><hamchin/><hamcirclei/></hamnosys_manual></hns_sign>',
        "why": '<hns_sign gloss="WHY"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamforehead/><hammoved/></hamnosys_manual></hns_sign>',
        "how": '<hns_sign gloss="HOW"><hamnosys_manual><hamsymmlr/><hamflathand/><hamextfingerd/><hampalmd/><hamchest/><hammoveu/></hamnosys_manual></hns_sign>',
        "yes": '<hns_sign gloss="YES"><hamnosys_manual><hamfist/><hamextfingero/><hampalmd/><hamneutralspace/><hammoved/><hamrepeatfromstart/></hamnosys_manual></hns_sign>',
        "no": '<hns_sign gloss="NO"><hamnosys_manual><hamfinger23/><hamextfingero/><hampalmd/><hamneutralspace/><hamnomotion/><hamreplace/><hampinch12/></hamnosys_manual></hns_sign>',
        "eat": '<hns_sign gloss="EAT"><hamnosys_manual><hampinchall/><hamfingerbendmod/><hamextfingeri/><hampalmd/><hamlips/><hamlrat/><hammovei/><hamsmallmod/><hamtouch/><hamrepeatfromstart/></hamnosys_manual></hns_sign>',
        "food": '<hns_sign gloss="FOOD"><hamnosys_manual><hampinchall/><hamfingerbendmod/><hamextfingeri/><hampalmd/><hamlips/><hamlrat/><hammovei/><hamsmallmod/><hamtouch/><hamrepeatfromstart/></hamnosys_manual></hns_sign>',
        "water": '<hns_sign gloss="WATER"><hamnosys_manual><hamfinger234/><hamthumboutmod/><hamextfingeru/><hampalml/><hamchin/><hamtouch/></hamnosys_manual></hns_sign>',
        "home": '<hns_sign gloss="HOME"><hamnosys_manual><hampinchall/><hamextfingeri/><hampalmd/><hamcheek/><hamtouch/></hamnosys_manual></hns_sign>',
        "love": '<hns_sign gloss="LOVE"><hamnosys_manual><hamsymmlr/><hamfist/><hamextfingeru/><hampalmu/><hamchest/><hamtouch/></hamnosys_manual></hns_sign>',
        "friend": '<hns_sign gloss="FRIEND"><hamnosys_manual><hamsymmlr/><hamfinger1/><hamextfingero/><hampalmd/><hamchest/><hamtouch/></hamnosys_manual></hns_sign>',
        "may": '<hns_sign gloss="MAY"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamchest/><hammoved/></hamnosys_manual></hns_sign>',
        "name": '<hns_sign gloss="NAME"><hamnosys_manual><hamsymmlr/><hamfinger23/><hamextfingero/><hampalmd/><hamneutralspace/><hammoved/><hamsmallmod/><hamrepeatfromstart/></hamnosys_manual></hns_sign>',
        "my": '<hns_sign gloss="MY"><hamnosys_manual><hamflathand/><hamextfingeru/><hampalml/><hamchest/><hamtouch/></hamnosys_manual></hns_sign>',
        "you": '<hns_sign gloss="YOU"><hamnosys_manual><hamfinger1/><hamextfingero/><hampalmd/><hamchest/><hammoveo/></hamnosys_manual></hns_sign>',
    }

    for word, sigml_code in builtin_signs.items():
        db[word] = sanitize_sigml(sigml_code)
    
    # Check corresponding SIGML files in DATA_DIR
    sigml_file_map = {
        "isl": ["Indian_SL.sigml"],
        "asl": ["American_SL_ASL.sigml", "asl_alphabet_sigml.sigml"],
        "bsl": ["hamnosys_bsl_version1.sigml", "bsl_alphabet_sigml.sigml"],
        "dgs": ["German_SL_DGS.sigml", "dgs_alphabet_sigml.sigml"],
        "lsf": ["French_SL_LSF.sigml", "lsf_alphabet_sigml.sigml"],
    }

    files_to_check = sigml_file_map.get(lang_key, [f"{lang_key}.sigml"])
    files_to_check.extend(["Indian_SL.sigml", "asl_alphabet_sigml.sigml"])

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
                    if gloss and gloss not in db:
                        sigml_str = ET.tostring(child, encoding="utf-8").decode("utf-8")
                        sanitized = sanitize_sigml(sigml_str)
                        if sanitized:
                            db[gloss] = sanitized
        except Exception as e:
            logger.warning(f"Error parsing SiGML file {fname}: {e}")

    # Check CSV files (e.g. hamnosys_bsl.csv, asl_curated_seed.csv)
    csv_files = [f"hamnosys_{lang_key}.csv", "asl_curated_seed.csv"]
    for csv_fname in csv_files:
        csv_path = DATA_DIR / csv_fname
        if not csv_path.exists():
            continue
        try:
            import csv
            with csv_path.open("r", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader, None)
                word_idx, ham_idx = -1, -1
                if header:
                    lower_header = [h.strip().lower() for h in header]
                    if "concept" in lower_header:
                        word_idx = lower_header.index("concept")
                    elif "gloss" in lower_header:
                        word_idx = lower_header.index("gloss")
                    elif "word" in lower_header:
                        word_idx = lower_header.index("word")

                    if "hamnosys" in lower_header:
                        ham_idx = lower_header.index("hamnosys")
                    elif "sigml" in lower_header:
                        ham_idx = lower_header.index("sigml")

                if word_idx == -1:
                    word_idx = 0
                if ham_idx == -1:
                    ham_idx = 2 if len(header or []) > 2 else 1

                for row in reader:
                    if len(row) > max(word_idx, ham_idx):
                        word = row[word_idx].strip().lower()
                        word = re.sub(r'\(.*?\)|#.*', '', word).strip()
                        ham = row[ham_idx].strip()
                        if word and word not in db and ham and ('ham' in ham.lower() or ham.startswith('<')):
                            sanitized = sanitize_sigml(f'<hns_sign gloss="{word.upper()}"><hamnosys_manual>{ham}</hamnosys_manual></hns_sign>')
                            if sanitized and '<hamnosys_manual></hamnosys_manual>' not in sanitized:
                                db[word] = sanitized
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


def process_text_to_gloss_list(text: str, language: str = "en", sign_language: str = "bsl") -> List[str]:
    text = (text or "").strip().lower()
    if not text:
        return []

    # Check phrase replacements
    for phrase, replacement in COMMON_PHRASES.items():
        if phrase in text:
            text = text.replace(phrase, replacement)

    nlp = get_spacy_nlp()
    stopwords = STOPWORDS.get(language, STOPWORDS["default"])

    if nlp is not None:
        doc = nlp(text)
        tokens_with_pos = []
        for token in doc:
            t_lower = token.text.lower()
            if not t_lower.isalnum():
                continue
            if t_lower in stopwords and t_lower not in {"not", "no"}:
                continue
            pos = token.pos_
            lemma = token.lemma_.lower() if pos == "VERB" else t_lower
            lemma = SYNONYMS.get(lemma, lemma)
            tokens_with_pos.append((lemma, pos))
        
        reordered = reorder_tokens(tokens_with_pos, sign_language)
        return reordered
    else:
        clean_words = re.findall(r"\b\w+\b", text)
        filtered = [w for w in clean_words if w not in stopwords or w in {"not", "no"}]
        synonym_mapped = [SYNONYMS.get(w, w) for w in filtered]
        return synonym_mapped


def plan_from_text(text: str, language: str = "en", sign_language: str = "bsl", use_ai: bool = True) -> Dict[str, object]:
    ai_plan = None
    if use_ai:
        ai_plan = translate_text_with_ai(text, sign_language=sign_language)

    if ai_plan and ai_plan.get("glosses"):
        glosses = [g.lower() for g in ai_plan["glosses"]]
        source = ai_plan.get("source", "AI_WRAPPER")
        facial_expression = ai_plan.get("facial_expression", "neutral")
    else:
        glosses = process_text_to_gloss_list(text, language=language, sign_language=sign_language)
        source = "LOCAL_NLP_ENGINE"
        facial_expression = "neutral"

    db = get_sign_database(sign_language)
    asl_db = get_sign_database("asl")

    sign_breakdown = []
    sigml_blocks = []

    for gloss in glosses:
        gloss_clean = SYNONYMS.get(gloss, gloss)
        match_sigml = (
            db.get(gloss_clean.lower()) or 
            db.get(gloss_clean.upper()) or 
            db.get(gloss.lower()) or 
            db.get(gloss.upper())
        )
        
        if match_sigml:
            sign_breakdown.append({
                "word": gloss_clean,
                "gloss": gloss_clean.upper(),
                "isFingerspelled": False,
                "sigml": match_sigml
            })
            sigml_blocks.append(match_sigml)
        else:
            char_blocks = []
            for ch in gloss_clean:
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

    clean_blocks = []
    for b in sigml_blocks:
        if b:
            b_clean = re.sub(r'<\?xml[^>]*\?>', '', b)
            b_clean = re.sub(r'<\/?sigml>', '', b_clean).strip()
            if b_clean:
                clean_blocks.append(b_clean)

    full_sigml = f'<?xml version="1.0" encoding="utf-8"?>\n<sigml>\n' + "\n".join(clean_blocks) + "\n</sigml>"

    return {
        "raw": text,
        "final": " ".join(glosses).upper(),
        "glosses": [g.upper() for g in glosses],
        "language": language,
        "sign_language": sign_language,
        "sigml": full_sigml,
        "signBreakdown": sign_breakdown,
        "facial_expression": facial_expression,
        "planner_source": source
    }

