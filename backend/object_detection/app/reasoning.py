import re
import time

def calculate_iou(box1: list, box2: list) -> float:
    """Calculates IoU between two [x1, y1, x2, y2] boxes."""
    if not box1 or not box2 or len(box1) != 4 or len(box2) != 4:
        return 0.0
    ix1 = max(box1[0], box2[0])
    iy1 = max(box1[1], box2[1])
    ix2 = min(box1[2], box2[2])
    iy2 = min(box1[3], box2[3])

    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0

    inter_area = (ix2 - ix1) * (iy2 - iy1)
    area1 = max(1, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    area2 = max(1, (box2[2] - box2[0]) * (box2[3] - box2[1]))
    union_area = area1 + area2 - inter_area
    return inter_area / union_area if union_area > 0 else 0.0

class SemanticAggregator:
    def __init__(self, stale_cooldown_sec: float = 10.0):
        # Map: obj_label -> list of {"box": list, "last_announced": float}
        self.announced_history = {}
        self.stale_cooldown_sec = stale_cooldown_sec

    def _parse_coordinates(self, box_str: str):
        """
        Parses a string like '[100, 150, 400, 800]' into a list of integers.
        """
        try:
            return [int(x.strip()) for x in box_str.strip("[]").split(",")]
        except ValueError:
            return None

    def _get_spatial_location(self, box: list) -> str:
        """
        Calculates relative position based on a 0-1000 normalized coordinate system.
        Box format: [xmin, ymin, xmax, ymax]
        """
        if not box or len(box) != 4:
            return ""

        xmin, ymin, xmax, ymax = box
        center_x = (xmin + xmax) / 2
        center_y = (ymin + ymax) / 2

        # Horizontal position
        if center_x < 333:
            h_pos = "left"
        elif center_x > 666:
            h_pos = "right"
        else:
            h_pos = "center"

        # Vertical position
        if center_y < 333:
            v_pos = "top"
        elif center_y > 666:
            v_pos = "bottom"
        else:
            v_pos = ""

        if h_pos == "center" and v_pos == "":
            return "center"
        elif v_pos:
            return f"{v_pos} {h_pos}".strip()
        else:
            return h_pos

    def parse_markdown_to_narrative(self, markdown_text: str, ignore_classes: list = None) -> dict:
        """
        Parses the Markdown output from the VLM.
        Finds objects and their bounding boxes.
        Applies repetition suppression (10s cooldown for stationary objects).
        Prioritizes physical objects over text reading.
        Returns a dictionary with 'narrative' (sentences to speak) and 'spatial_audio' data.
        """
        narrative_sentences = []
        spatial_data = []
        ignored_set = set(c.lower() for c in ignore_classes) if ignore_classes else set()

        pattern = re.compile(r'- (.*?):\s*(\[\d+,\s*\d+,\s*\d+,\s*\d+\])')
        matches = pattern.findall(markdown_text)

        if not matches:
            clean_text = re.sub(r'[*#]', '', markdown_text).strip()
            return {"narrative": [clean_text] if clean_text else [], "spatial_data": []}

        now = time.time()
        
        # Separate physical objects and text detections
        object_items = []
        text_items = []
        
        for raw_obj_name, box_str in matches:
            if raw_obj_name.lower() in ignored_set:
                continue
            box = self._parse_coordinates(box_str)
            if not box:
                continue
                
            is_text = raw_obj_name.startswith("text reading")
            item = {"label": raw_obj_name, "box": box, "is_text": is_text}
            
            if is_text:
                text_items.append(item)
            else:
                object_items.append(item)

        # Number duplicate physical objects if any unnumbered labels exist
        by_base_label = {}
        for item in object_items:
            base = re.sub(r'\s+\d+$', '', item["label"]).strip()
            by_base_label.setdefault(base, []).append(item)

        for base, items in by_base_label.items():
            if len(items) > 1:
                items.sort(key=lambda x: x["box"][0]) # left to right
                for idx, item in enumerate(items, start=1):
                    item["label"] = f"{base} {idx}"

        # Combine: PHYSICAL OBJECTS FIRST, followed by at most 2 text readings
        combined_items = object_items + text_items[:2]

        for item in combined_items:
            obj_name = item["label"]
            box = item["box"]
            is_text = item["is_text"]
            
            # Check repetition history with IoU
            history = self.announced_history.get(obj_name, [])
            recently_announced = False
            
            for record in history:
                prev_box = record["box"]
                prev_time = record["last_announced"]
                if calculate_iou(box, prev_box) > 0.40 and (now - prev_time) < self.stale_cooldown_sec:
                    recently_announced = True
                    break

            if recently_announced:
                continue

            # Update history
            new_history = [r for r in history if (now - r["last_announced"]) < self.stale_cooldown_sec]
            new_history.append({"box": box, "last_announced": now})
            self.announced_history[obj_name] = new_history

            location = self._get_spatial_location(box)
            if is_text:
                clean_txt = obj_name.replace('text reading "', '').rstrip('"')
                if location == "center":
                    sentence = f"I see text reading '{clean_txt}' in the center."
                else:
                    sentence = f"I see text reading '{clean_txt}' on the {location}."
            else:
                if location == "center":
                    sentence = f"I see a {obj_name} in the center."
                else:
                    sentence = f"I see a {obj_name} on the {location}."
                
            narrative_sentences.append(sentence)
            
            center_x = (box[0] + box[2]) / 2
            pan = (center_x / 500.0) - 1.0 
            
            spatial_data.append({
                "object": obj_name,
                "location": location,
                "pan": max(-1.0, min(1.0, pan))
            })

        return {
            "narrative": narrative_sentences,
            "spatial_data": spatial_data
        }

class PromptManager:
    def __init__(self):
        self.aggregator = SemanticAggregator()

    def generate_speech_payload(self, vlm_markdown: str, ignore_classes: list = None):
        """
        Transforms the VLM's structured Markdown into a final payload for the TTS layer.
        """
        parsed_data = self.aggregator.parse_markdown_to_narrative(vlm_markdown, ignore_classes=ignore_classes)
        return parsed_data

