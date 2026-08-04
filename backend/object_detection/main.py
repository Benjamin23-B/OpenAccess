from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
import asyncio
import json
import base64
import os
import sys
from pathlib import Path

# Add parent directory to sys.path so app module can be imported
sys.path.insert(0, str(Path(__file__).parent))

from app.ingestion import IngestionPipeline
from app.vlm_engine import VLMEngine
from app.reasoning import PromptManager
from app.tts_streaming import StreamingTTSController

app = FastAPI(title="Multimodal AI Scene Narration API")

# Enable CORS for Next.js frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the 4 layers
ingestion = IngestionPipeline(delta_threshold=0.85)
vlm_engine = VLMEngine(mock_mode=False) 
reasoning = PromptManager()
tts_engine = StreamingTTSController()

@app.get("/")
def root():
    return {"message": "Object Detection & Multimodal Scene AI Server is running", "ws_endpoint": "/ws/stream"}

@app.get("/api/status")
def status():
    return {"status": "Server is running", "service": "Object Detection AI"}

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    print("[Object Detection WS] Client connected to /ws/stream")
    
    try:
        while True:
            data_str = await websocket.receive_text()
            data = json.loads(data_str)
            
            command = data.get("command", None)
            
            if "image" in data:
                image_bytes = base64.b64decode(data["image"])
                
                # A. Ingestion Layer
                high_res_mode = data.get("high_res_mode", False)
                pil_image = ingestion.process_frame(image_bytes, high_res_mode=high_res_mode)
                
                if pil_image is None:
                    await websocket.send_text(json.dumps({"type": "audio_end", "reason": "no_change"}))
                    continue

                # B. Multimodal Perception Layer
                markdown_result, detections = vlm_engine.process_image_detailed(pil_image, text_prompt=command)
                
                # Send structured bounding box detections to frontend
                await websocket.send_text(json.dumps({
                    "type": "detections",
                    "objects": detections
                }))
                
                # C. Reasoning Layer
                narrative_payload = reasoning.generate_speech_payload(markdown_result)

                
                for sentence in narrative_payload.get("narrative", []):
                    await websocket.send_text(json.dumps({"type": "narrative_text", "text": sentence}))

                if len(narrative_payload.get("narrative", [])) > 0:
                    await websocket.send_text(json.dumps({"type": "haptic", "action": "pulse"}))

                # D. TTS Audio Layer
                async for chunk in tts_engine.process_narrative_payload(narrative_payload):
                    if chunk["type"] == "audio":
                        metadata = json.dumps({"type": "audio_metadata", "pan": chunk["pan"]})
                        await websocket.send_text(metadata)
                        await websocket.send_bytes(chunk["data"])
                    elif chunk["type"] == "word_boundary":
                        await websocket.send_text(json.dumps(chunk))
                
                await websocket.send_text(json.dumps({"type": "audio_end"}))

    except WebSocketDisconnect:
        print("[Object Detection WS] Client disconnected")
    except Exception as e:
        print(f"[Object Detection WS] Exception: {e}")
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8889))
    uvicorn.run(app, host="0.0.0.0", port=port)

