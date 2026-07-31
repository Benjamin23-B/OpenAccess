import os
from pathlib import Path
from PIL import Image
import numpy as np
import torch

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

try:
    import easyocr
    HAS_EASYOCR = True
except ImportError:
    HAS_EASYOCR = False

class VLMEngine:
    def __init__(self, mock_mode: bool = False):
        self.mock_mode = mock_mode
        self.model = None
        self.reader = None
        
        if not self.mock_mode:
            self._initialize_model()

    def _initialize_model(self):
        """
        Initializes a lightweight YOLO model instead of a massive VLM.
        Also initializes EasyOCR for text reading.
        """
        if not HAS_YOLO:
            print("Ultralytics not installed. Falling back to mock mode.")
            self.mock_mode = True
            return
            
        print("Loading lightweight YOLO Model...")
        model_path = Path(__file__).parent.parent / "yolo26n.pt"
        if not model_path.exists():
            model_path = Path(__file__).parent.parent / "yolov8n.pt"
        if not model_path.exists():
            model_path = "yolov8n.pt"

        try:
            self.model = YOLO(str(model_path)) 
            print("Model Loaded Instantly.")
        except Exception as e:
            print(f"Model load error: {e}. Falling back to mock mode.")
            self.mock_mode = True
            return

        if HAS_EASYOCR:
            print("Loading EasyOCR Reader...")
            gpu_available = torch.cuda.is_available()
            try:
                self.reader = easyocr.Reader(['en'], gpu=gpu_available, verbose=False)
                print("EasyOCR Reader Loaded.")
            except Exception as e:
                print(f"EasyOCR init error: {e}")
        else:
            print("EasyOCR not installed. Text reading will be disabled.")

    def process_image(self, image: Image.Image, text_prompt: str = None) -> str:
        """
        Processes the image through YOLO and EasyOCR, and formats the results into structured Markdown.
        """
        if self.mock_mode or self.model is None:
            return """
# Scene Analysis
## Objects Detected
- Person: [100, 150, 400, 800]
- Laptop: [450, 300, 750, 600]
## Text Detected
- text reading "AI Vision Active": [100, 50, 500, 120]
"""
            
        # Actual Inference Logic using YOLO
        results = self.model(image, verbose=False)
        
        markdown_lines = ["# Scene Analysis\n", "## Objects Detected"]
        
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                class_name = self.model.names[cls_id]
                
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                norm_x1 = int((x1 / image.width) * 1000)
                norm_y1 = int((y1 / image.height) * 1000)
                norm_x2 = int((x2 / image.width) * 1000)
                norm_y2 = int((y2 / image.height) * 1000)
                
                conf = box.conf[0].item()
                if conf > 0.50:
                    markdown_lines.append(f"- {class_name}: [{norm_x1}, {norm_y1}, {norm_x2}, {norm_y2}]")
        
        if len(markdown_lines) == 2:
            markdown_lines.append("- None detected.")
            
        # OCR / Text Detection Layer
        if self.reader is not None:
            ocr_max_dim = 600
            ocr_image = image.copy()
            w, h = ocr_image.size
            if max(w, h) > ocr_max_dim:
                scale = ocr_max_dim / max(w, h)
                ocr_image = ocr_image.resize((int(w * scale), int(h * scale)), Image.Resampling.BILINEAR)
            
            ocr_w, ocr_h = ocr_image.size
            image_np = np.array(ocr_image)
            
            try:
                ocr_results = self.reader.readtext(image_np, paragraph=True)
                
                text_lines = []
                for bbox, text in ocr_results:
                    text = text.strip()
                    if text:
                        xs = [pt[0] for pt in bbox]
                        ys = [pt[1] for pt in bbox]
                        x1, y1 = min(xs), min(ys)
                        x2, y2 = max(xs), max(ys)
                        
                        norm_x1 = int((x1 / ocr_w) * 1000)
                        norm_y1 = int((y1 / ocr_h) * 1000)
                        norm_x2 = int((x2 / ocr_w) * 1000)
                        norm_y2 = int((y2 / ocr_h) * 1000)
                        
                        text_escaped = text.replace('"', '\\"')
                        text_lines.append(f"- text reading \"{text_escaped}\": [{norm_x1}, {norm_y1}, {norm_x2}, {norm_y2}]")
                
                if text_lines:
                    markdown_lines.append("\n## Text Detected")
                    markdown_lines.extend(text_lines)
            except Exception as e:
                print(f"OCR Error: {e}")
            
        output_text = "\n".join(markdown_lines)
        return output_text
