"""Kozha Sign Language Engine (FastAPI) — port 8001.

Serves the genuine zhan-a/Kozha translation pipeline: spaCy NLP + gloss
reordering. The gloss->SiGML mapping happens client-side in the frontend
(``kozhaClient``) by loading the shipped ``*.sigml`` databases — exactly the
real Kozha architecture.

Endpoints mirror the real Kozha server contract:
  GET  /api/health           -> liveness
  POST /api/plan             -> { raw, final (gloss string), language, sign_language, ... }
  POST /api/translate        -> { glosses, raw }
"""

import warnings
warnings.filterwarnings("ignore")

from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from kozha_engine import (
    plan_from_text,
    process_text,
    text_to_glosses,
    signature_note,
)

app = FastAPI(title="Kozha Sign Language Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextRequest(BaseModel):
    text: str
    language: str = "en"
    sign_language: str = "bsl"
    reviewed_only: bool = False


class TranslateTextRequest(BaseModel):
    text: Optional[str] = None
    source_text: Optional[str] = None
    source_lang: str = "en"
    target_lang: str = "en"
    target_sign_lang: Optional[str] = "isl"


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Kozha SL Engine", "engine": signature_note()}


@app.post("/api/plan")
def api_plan(req: TextRequest):
    input_text = (req.text or "").strip()
    if not input_text:
        return {"error": "Empty text"}
    return plan_from_text(
        input_text,
        language=req.language,
        sign_language=req.sign_language,
    )


@app.post("/api/translate")
def api_translate(req: TextRequest):
    input_text = (req.text or "").strip()
    if not input_text:
        return {"glosses": [], "raw": ""}
    glosses = text_to_glosses(input_text, source_lang=req.language)
    return {"glosses": glosses, "raw": input_text}


@app.post("/api/translate-text")
def api_translate_text(req: TranslateTextRequest):
    text = (req.text or req.source_text or "").strip()
    sign_lang = req.target_sign_lang or "isl"
    if not text:
        return {"translated": ""}
    plan = plan_from_text(text, language=req.source_lang, sign_language=sign_lang)
    return {
        "translated": plan.get("final", text),
        "glosses": [t for t in plan.get("final", "").split() if t != "."],
        "sign_language": sign_lang,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)