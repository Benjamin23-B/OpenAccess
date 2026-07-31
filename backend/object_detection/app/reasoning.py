import re

class SemanticAggregator:
    def __init__(self):
        pass

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

    def parse_markdown_to_narrative(self, markdown_text: str) -> dict:
        """
        Parses the Markdown output from the VLM.
        Finds objects and their bounding boxes.
        Returns a dictionary with 'narrative' (sentences to speak) and 'spatial_audio' data.
        """
        narrative_sentences = []
        spatial_data = []

        pattern = re.compile(r'- (.*?):\s*(\[\d+,\s*\d+,\s*\d+,\s*\d+\])')
        matches = pattern.findall(markdown_text)

        if not matches:
            clean_text = re.sub(r'[*#]', '', markdown_text).strip()
            return {"narrative": [clean_text], "spatial_data": []}

        for obj_name, box_str in matches:
            box = self._parse_coordinates(box_str)
            if box:
                location = self._get_spatial_location(box)
                sentence = f"I see a {obj_name} on the {location}."
                if location == "center":
                    sentence = f"I see a {obj_name} in the center."
                    
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

    def generate_speech_payload(self, vlm_markdown: str):
        """
        Transforms the VLM's structured Markdown into a final payload for the TTS layer.
        """
        parsed_data = self.aggregator.parse_markdown_to_narrative(vlm_markdown)
        return parsed_data
