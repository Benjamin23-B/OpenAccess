import os
from pathlib import Path
from PIL import Image
import numpy as np
import torch
import cv2

try:
    from ultralytics import YOLO, YOLOWorld
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
    def __init__(self, mock_mode: bool = False, conf_threshold: float = 0.75):
        self.mock_mode = mock_mode
        self.conf_threshold = conf_threshold
        self.model = None
        self.reader = None
        
        if not self.mock_mode:
            self._initialize_model()

    def _initialize_model(self):
        """
        Initializes a lightweight open-vocabulary YOLO-World model.
        Also initializes EasyOCR for text reading.
        """
        if not HAS_YOLO:
            print("Ultralytics not installed. Falling back to mock mode.")
            self.mock_mode = True
            return
            
        print("Loading lightweight open-vocabulary YOLO-World Model...")
        model_path = Path(__file__).parent.parent / "yolov8s-worldv2.pt"
        if not model_path.exists():
            model_path = "yolov8s-worldv2.pt"

        try:
            # Load open-vocabulary YOLO-World model
            self.model = YOLOWorld(str(model_path))
            
            # Set a rich list of everyday object classes to recognize
            self.model.set_classes([
                "person", "backpack", "umbrella", "handbag", "tie", "suitcase", 
                "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", 
                "banana", "apple", "orange", "sandwich", "broccoli", "carrot", 
                "pizza", "donut", "cake", "chair", "couch", "potted plant", "bed", 
                "dining table", "toilet", "tv", "laptop", "mouse", "remote", 
                "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", 
                "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", 
                "hair drier", "toothbrush", "pen", "pencil", "wallet", "keys", 
                "glasses", "notebook", "desk", "coffee mug"
            ])
            print("YOLO-World Model Loaded and Configured.")
        except Exception as e:
            print(f"YOLO-World load error: {e}. Falling back to standard YOLO...")
            fallback_path = Path(__file__).parent.parent / "yolo26n.pt"
            if not fallback_path.exists():
                fallback_path = "yolov8n.pt"
            try:
                self.model = YOLO(str(fallback_path))
                print("Fallback standard YOLO loaded successfully.")
            except Exception as fe:
                print(f"Fallback YOLO load error: {fe}. Falling back to mock mode.")
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
            
        # Actual Inference Logic using YOLO (imgsz=320 drastically improves latency)
        results = self.model(image, conf=self.conf_threshold, iou=0.45, imgsz=320, verbose=False)
        
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
