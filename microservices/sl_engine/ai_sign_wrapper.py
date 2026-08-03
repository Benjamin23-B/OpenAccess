"""
AI Sign Language Translation Wrapper Module
Provides OpenAI-compatible LLM endpoint integration (OpenAI, Gemini, Ollama, Groq, vLLM, LM Studio)
for translating natural text into Sign Language Glosses, Sign Grammar structures, and SiGML/HamNoSys hints.
"""
import os
import json
import logging
import urllib.request
import urllib.error
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

def load_env_file():
    """Dynamically search and load key-value pairs from .env files into os.environ."""
    candidates = [
        Path(__file__).resolve().parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
    ]
    for path in candidates:
        if path.exists():
            try:
                with path.open("r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception as e:
                logger.warning(f"Failed to read .env file at {path}: {e}")

load_env_file()

def get_config():
    api_key = os.getenv("OPENAI_API_KEY") or os.getenv("AI_SIGN_API_KEY") or os.getenv("GEMINI_API_KEY") or ""
    base_url = (os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL") or "gpt-4o-mini"

    # Smart URL auto-detection: if OPENAI_API_KEY is formatted as a URL (e.g. https://omni.gces.net.in/v1/), route it to base_url
    if api_key.startswith("http://") or api_key.startswith("https://"):
        base_url = api_key.rstrip("/")
        api_key = os.getenv("AI_SIGN_API_KEY") or os.getenv("GEMINI_API_KEY") or "omni-key"

    return api_key, base_url, model

SYSTEM_PROMPT = """You are an expert Sign Language Translator specializing in Indian Sign Language (ISL), American Sign Language (ASL), and British Sign Language (BSL).
Your job is to translate spoken/written natural language text into a structured Sign Language plan.

Rules for Sign Language Translation:
1. Reorder sentences according to Sign Language grammar:
   - TIME FIRST: Place time indicators (today, yesterday, tomorrow, morning) at the start.
   - TOPIC-COMMENT / SOV: Place main subject/object before action verb (e.g. "I eat food" -> "FOOD ME EAT").
   - QUESTION AT END: Place question words (WHAT, WHERE, WHY, HOW) at the end.
   - OMIT STOPWORDS: Remove articles (a, an, the), auxiliary verbs (is, am, are, was, were, be), and conjunctions (and, but) unless essential.
2. Produce a JSON object with:
   - "glosses": array of uppercase root sign words (e.g. ["TODAY", "HOSPITAL", "GO", "WHERE"]). Only return standard English gloss dictionary words. Do NOT generate raw character codes or HamNoSys notation.
   - "facial_expression": facial/head posture marker ("question_eyebrows_raised", "affirmative_nod", "negative_headshake", "neutral").
   - "grammar_note": short explanation of sign grammar ordering applied.

Output ONLY valid JSON matching this structure without markdown fences:
{
  "glosses": ["WORD1", "WORD2"],
  "facial_expression": "neutral",
  "grammar_note": "Explanation"
}"""

def translate_text_with_ai(text: str, sign_language: str = "isl") -> Optional[Dict[str, Any]]:
    """
    Call OpenAI-compatible endpoint to translate text into Sign Language Gloss plan.
    Returns None if API key is unconfigured or call fails, triggering local fallback.
    """
    if not text or not text.strip():
        return None

    # Reload env dynamically to pick up any runtime updates to .env file
    load_env_file()
    api_key, base_url, model = get_config()

    if not api_key:
        logger.info("[AI Wrapper] No OPENAI_API_KEY configured in environment or .env. Falling back to local Kozha NLP engine.")
        return None

    target_lang_name = {
        "isl": "Indian Sign Language (ISL)",
        "bsl": "British Sign Language (BSL)",
        "asl": "American Sign Language (ASL)",
        "dgs": "German Sign Language (DGS)",
        "lsf": "French Sign Language (LSF)",
    }.get(sign_language.lower(), "Indian Sign Language (ISL)")

    user_prompt = f"Translate the following text into {target_lang_name} Glosses:\n\"{text}\""

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 300,
    }

    url = f"{base_url}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=8) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)

            content = res_json["choices"][0]["message"]["content"].strip()
            # Clean markdown codeblocks if returned
            if content.startswith("```"):
                content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            parsed = json.loads(content)
            if isinstance(parsed, dict) and "glosses" in parsed:
                return {
                    "glosses": [str(g).upper().strip() for g in parsed.get("glosses", []) if g],
                    "facial_expression": parsed.get("facial_expression", "neutral"),
                    "grammar_note": parsed.get("grammar_note", ""),
                    "source": f"AI_WRAPPER ({model})"
                }
    except Exception as e:
        logger.warning(f"[AI Wrapper] Call failed: {e}. Falling back to local NLP engine.")

    return None
