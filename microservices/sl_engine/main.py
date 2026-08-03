import asyncio
import torch
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict

# Import ML Pipeline Modules & Kozha Translator
from data.preprocess_gloss import TextToGlossPreprocessor
from models.nmt_model import SignGlossNMTTransformer
from models.motion_model import GlossToMotionLSTM
from utils.smoothing import MotionSmoother
from kozha_translator import plan_from_text, process_text_to_gloss_list

app = FastAPI(title="Niral Thiruvizha - Sign Language Engine")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Pipeline Components
preprocessor = TextToGlossPreprocessor()
smoother = MotionSmoother(window_length=5, polyorder=2)

VOCAB_SIZE = 1000
try:
    nmt_model = SignGlossNMTTransformer(vocab_size=VOCAB_SIZE)
    nmt_model.eval()
    motion_model = GlossToMotionLSTM(gloss_vocab_size=VOCAB_SIZE, num_joints=21, output_dim=4)
    motion_model.eval()
except Exception as e:
    print(f"[WARN] Neural pipeline fallback mode: {e}")

class TextRequest(BaseModel):
    text: str
    language: str = "en"
    sign_language: str = "isl"
    reviewed_only: bool = False
    use_ai: bool = True

class TranslateTextRequest(BaseModel):
    text: Optional[str] = None
    source_text: Optional[str] = None
    source_lang: str = "en"
    target_lang: str = "en"
    target_sign_lang: Optional[str] = "isl"
    use_ai: bool = True

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Kozha SL Engine with AI Wrapper"}

@app.post("/api/plan")
def api_plan(req: TextRequest):
    input_text = (req.text or "").strip()
    if not input_text:
        return {"error": "Empty text provided"}
    return plan_from_text(input_text, language=req.language, sign_language=req.sign_language, use_ai=req.use_ai)

@app.post("/api/ai-plan")
def api_ai_plan(req: TextRequest):
    input_text = (req.text or "").strip()
    if not input_text:
        return {"error": "Empty text provided"}
    return plan_from_text(input_text, language=req.language, sign_language=req.sign_language, use_ai=True)

@app.post("/api/translate")
def api_translate(req: TextRequest):
    input_text = (req.text or "").strip()
    if not input_text:
        return {"glosses": [], "raw": ""}
    glosses = process_text_to_gloss_list(input_text, language=req.language, sign_language=req.sign_language)
    return {"glosses": glosses, "raw": input_text}

@app.post("/api/translate-text")
def api_translate_text(req: TranslateTextRequest):
    text = (req.text or req.source_text or "").strip()
    sign_lang = req.target_sign_lang or "isl"
    if not text:
        return {"translated": ""}
    plan = plan_from_text(text, language=req.source_lang, sign_language=sign_lang, use_ai=req.use_ai)
    return {
        "translated": plan.get("final", text),
        "glosses": plan.get("glosses", []),
        "sigml": plan.get("sigml", ""),
        "signBreakdown": plan.get("signBreakdown", []),
        "facial_expression": plan.get("facial_expression", "neutral"),
        "planner_source": plan.get("planner_source", "LOCAL_ENGINE")
    }

@app.websocket("/ws/sign_ml")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            text_data = await websocket.receive_text()
            print(f"Received Text: {text_data}")
            
            plan = plan_from_text(text_data, use_ai=False)
            num_glosses = max(1, len(plan.get("glosses", [])))
            num_frames = num_glosses * 30

            # Deterministic kinematic trajectory generation (interpolated wave)
            t = np.linspace(0, num_glosses * np.pi * 2, num_frames)
            
            for f in range(num_frames):
                frame_data = {
                    "rightShoulder": [0.6, float(np.sin(t[f]) * 0.2), 0.2],
                    "rightElbow": [1.4, float(np.cos(t[f]) * 0.15), 0.0],
                    "leftShoulder": [0.5, -float(np.sin(t[f]) * 0.2), -0.2],
                    "leftElbow": [1.2, float(np.cos(t[f]) * 0.15), 0.0],
                    "fingers": [float(np.abs(np.sin(t[f])))]
                }
                
                await websocket.send_json({"type": "frame", "data": frame_data})
                await asyncio.sleep(1/30)
                
            await websocket.send_json({"type": "status", "data": "Idle"})

    except WebSocketDisconnect:
        print("Client disconnected from ML Pipeline stream.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)


