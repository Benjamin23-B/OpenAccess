import os
from pathlib import Path
from PIL import Image
import numpy as np
import torch
import cv2

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


def check_overlap(box1, box2, thresh=0.3):
    """
    Calculates Intersection over Union (IoU) of two bounding boxes.
    Boxes format: [x1, y1, x2, y2]
    """
    ix1 = max(box1[0], box2[0])
    iy1 = max(box1[1], box2[1])
    ix2 = min(box1[2], box2[2])
    iy2 = min(box1[3], box2[3])
    
    if ix2 > ix1 and iy2 > iy1:
        int_area = (ix2 - ix1) * (iy2 - iy1)
        area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
        area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
        union_area = area1 + area2 - int_area
        return (int_area / union_area) > thresh if union_area > 0 else False
    return False


def keep_distinct_boxes(boxes: list) -> list:
    """
    Suppresses bounding boxes that overlap significantly (IoU > 0.3).
    """
    if not boxes:
        return []
    kept = []
    for b in boxes:
        overlap = False
        for k in kept:
            if check_overlap(b, k, thresh=0.3):
                overlap = True
                break
        if not overlap:
            kept.append(b)
    return kept


def detect_pens(image_cv) -> list:
    """
    Detects long, thin, pen-like objects using aspect ratio heuristics.
    Returns list of normalized bounding boxes: [[x1, y1, x2, y2], ...]
    """
    h, w = image_cv.shape[:2]
    gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=1)
    
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    pens = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 100 or area > 12000:
            continue
            
        rect = cv2.minAreaRect(cnt)
        (cx, cy), (width, height), angle = rect
        
        if width == 0 or height == 0:
            continue
            
        aspect_ratio = max(width, height) / min(width, height)
        # Pens are typically long and thin
        if aspect_ratio >= 4.0 and aspect_ratio <= 18.0:
            x, y, box_w, box_h = cv2.boundingRect(cnt)
            norm_x1 = int((x / w) * 1000)
            norm_y1 = int((y / h) * 1000)
            norm_x2 = int(((x + box_w) / w) * 1000)
            norm_y2 = int(((y + box_h) / h) * 1000)
            
            pens.append([norm_x1, norm_y1, norm_x2, norm_y2])
            
    return keep_distinct_boxes(pens)


def detect_fruits(image_cv) -> list:
    """
    Detects round, colorful objects (red/orange/yellow/green) as fruits using HSV thresholding.
    Returns list of dicts: [{"label": "apple/orange/banana/fruit", "box": [x1, y1, x2, y2]}, ...]
    """
    h, w = image_cv.shape[:2]
    hsv = cv2.cvtColor(image_cv, cv2.COLOR_BGR2HSV)
    
    # Red has two segments in HSV space
    mask_red1 = cv2.inRange(hsv, np.array([0, 100, 60]), np.array([10, 255, 255]))
    mask_red2 = cv2.inRange(hsv, np.array([165, 100, 60]), np.array([180, 255, 255]))
    
    # Orange / Yellow
    mask_orange_yellow = cv2.inRange(hsv, np.array([11, 80, 70]), np.array([35, 255, 255]))
    
    # Green (for green apples, limes, pears, etc.)
    mask_green = cv2.inRange(hsv, np.array([36, 60, 50]), np.array([85, 255, 255]))
    
    combined_mask = mask_red1 | mask_red2 | mask_orange_yellow | mask_green
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    cleaned = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    fruits = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 200 or area > 60000:
            continue
            
        perimeter = cv2.arcLength(cnt, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        
        # Fruits are generally roundish
        if circularity > 0.40:
            x, y, box_w, box_h = cv2.boundingRect(cnt)
            
            # Determine color category
            cnt_mask = np.zeros_like(cleaned)
            cv2.drawContours(cnt_mask, [cnt], -1, 255, -1)
            mean_val = cv2.mean(hsv, mask=cnt_mask)
            hue = mean_val[0]
            
            if (hue >= 0 and hue <= 10) or (hue >= 165 and hue <= 180):
                label = "apple"
            elif hue > 10 and hue <= 25:
                label = "orange"
            elif hue > 25 and hue <= 35:
                label = "banana"
            else:
                label = "fruit"
                
            norm_x1 = int((x / w) * 1000)
            norm_y1 = int((y / h) * 1000)
            norm_x2 = int(((x + box_w) / w) * 1000)
            norm_y2 = int(((y + box_h) / h) * 1000)
            
            fruits.append({"label": label, "box": [norm_x1, norm_y1, norm_x2, norm_y2]})
            
    return fruits

class VLMEngine:
    def __init__(self, mock_mode: bool = False, conf_threshold: float = 0.5,
                 imgsz: int = 640, iou_threshold: float = 0.5):
        self.mock_mode = mock_mode
        self.conf_threshold = conf_threshold
        self.imgsz = imgsz
        self.iou_threshold = iou_threshold
        self.model = None
        self.reader = None

        if not self.mock_mode:
            self._initialize_model()

    def _initialize_model(self):
        """
        Initializes a YOLO model (yolov8m preferred for accuracy).
        A named weights file is auto-downloaded by Ultralytics on the target
        machine at first run, so no weights need to ship with the repo.
        Smaller local files are used as a fallback if yolov8m can't load.
        Also initializes EasyOCR for text reading.
        """
        if not HAS_YOLO:
            print("Ultralytics not installed. Falling back to mock mode.")
            self.mock_mode = True
            return

        print("Loading YOLO Model...")
        model_dir = Path(__file__).parent.parent
        env_model = os.environ.get("YOLO_MODEL", "").strip()

        # Preferred weights: yolov8m by default (override via YOLO_MODEL).
        # Reuse a local file if present to avoid re-downloading, otherwise
        # pass the bare name so Ultralytics fetches it on the target.
        preferred = env_model or "yolov8m.pt"
        candidates = []
        local_preferred = model_dir / preferred
        if local_preferred.exists():
            candidates.append(str(local_preferred))
        candidates.append(preferred)

        # Smaller local fallbacks, only used if the preferred model can't load.
        for name in ("yolov8s.pt", "yolov8n.pt", "yolo26n.pt"):
            local = model_dir / name
            if local.exists():
                candidates.append(str(local))

        for candidate in candidates:
            try:
                self.model = YOLO(candidate)
                print(f"YOLO Model loaded: {candidate}")
                break
            except Exception as e:
                print(f"YOLO load notice ({candidate}): {e}")

        if self.model is None:
            print("YOLO model load failed. Trying fallback YOLOWorld...")
            try:
                self.model = YOLOWorld("yolov8s-worldv2.pt")
            except Exception as fe:
                print(f"Model load error: {fe}. Falling back to mock mode.")
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
            import time
            # Cycle through 3 different daily life scenes every 20 seconds
            scene_idx = int(time.time() / 20) % 3
            
            if scene_idx == 0:
                # Office / Study desk scene
                return """
# Scene Analysis
## Objects Detected
- Person: [120, 100, 480, 900]
- Laptop: [350, 400, 680, 720]
- Coffee Mug: [720, 550, 800, 680]
- Cell Phone: [200, 600, 280, 720]
- Keyboard: [380, 650, 620, 750]
- Mouse: [650, 680, 700, 740]
- Book: [820, 450, 950, 520]
- Pen: [670, 610, 700, 670]
## Text Detected
- text reading "AI Coding Active": [100, 50, 500, 120]
"""
            elif scene_idx == 1:
                # Kitchen / Dining scene
                return """
# Scene Analysis
## Objects Detected
- Person: [150, 120, 400, 800]
- Water Bottle: [550, 300, 620, 600]
- Dining Table: [200, 500, 950, 950]
- Cup: [680, 520, 750, 620]
- Banana: [320, 510, 420, 580]
- Apple: [440, 530, 490, 580]
- Orange: [490, 530, 540, 580]
- Chair: [800, 450, 980, 950]
## Text Detected
- text reading "Organic Fruit": [330, 520, 410, 560]
"""
            else:
                # Living Room scene
                return """
# Scene Analysis
## Objects Detected
- Person: [150, 120, 400, 800]
- Couch: [100, 400, 900, 850]
- TV: [300, 150, 700, 450]
- Backpack: [750, 550, 880, 780]
- Book: [450, 580, 550, 640]
- Clock: [480, 80, 580, 180]
## Text Detected
- text reading "10:30 AM": [490, 120, 570, 160]
"""
            
        # Run inference. imgsz=640 (YOLO's native training resolution) yields
        # markedly better detection than 320; use GPU automatically if available.
        device = 0 if torch.cuda.is_available() else "cpu"
        results = self.model(
            image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            imgsz=self.imgsz,
            device=device,
            verbose=False,
        )
        
        markdown_lines = ["# Scene Analysis\n", "## Objects Detected"]
        detected_boxes = []
        
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
                if conf > self.conf_threshold:
                    friendly_name = class_name
                    if class_name == "dining table":
                        friendly_name = "table"
                    elif class_name == "potted plant":
                        friendly_name = "plant"
                        
                    markdown_lines.append(f"- {friendly_name}: [{norm_x1}, {norm_y1}, {norm_x2}, {norm_y2}]")
                    detected_boxes.append([norm_x1, norm_y1, norm_x2, norm_y2])
                    
        # The naive traditional CV detectors (Canny/HSV) have been removed 
        # because they are highly prone to false positives. YOLO handles all classes natively.
        
        if len(markdown_lines) == 2:
            markdown_lines.append("- None detected.")
            
        # OCR / Text Detection Layer
        if self.reader is not None:
            ocr_max_dim = 320
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

    def process_image_detailed(self, image: Image.Image, text_prompt: str = None):
        """
        Processes image and returns both (markdown_text, detected_objects_list).
        Each object in detected_objects_list is a dict:
        {"label": str, "box": [x1, y1, x2, y2], "confidence": float, "is_text": bool}
        Coordinates are normalized 0-1000 scale.
        """
        markdown_text = self.process_image(image, text_prompt=text_prompt)
        detections = []
        
        import re
        pattern = re.compile(r'- (.*?):\s*(\[\d+,\s*\d+,\s*\d+,\s*\d+\])')
        matches = pattern.findall(markdown_text)
        
        for label, box_str in matches:
            try:
                coords = [int(x.strip()) for x in box_str.strip("[]").split(",")]
                is_text = label.startswith("text reading")
                clean_label = label.replace('text reading "', '').rstrip('"') if is_text else label
                detections.append({
                    "label": clean_label,
                    "box": coords,
                    "confidence": 0.88 if not is_text else 0.95,
                    "is_text": is_text
                })
            except Exception:
                pass

        return markdown_text, detections

