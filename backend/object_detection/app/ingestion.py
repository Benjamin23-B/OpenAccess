import cv2
import numpy as np
from PIL import Image
import io

class IngestionPipeline:
    def __init__(self, delta_threshold: float = 0.85):
        """
        Initializes the data ingestion layer.
        :param delta_threshold: SSIM-like structural similarity threshold. 
                                Frames more similar than this are ignored.
        """
        self.last_frame = None
        self.delta_threshold = delta_threshold

    def _calculate_similarity(self, frame1: np.ndarray, frame2: np.ndarray) -> float:
        """
        Calculates a fast structural similarity index or histogram intersection.
        For speed, we use a simple histogram comparison.
        """
        hist1 = cv2.calcHist([frame1], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        hist2 = cv2.calcHist([frame2], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        
        cv2.normalize(hist1, hist1, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
        
        # Compare using Bhattacharyya distance (0 means identical, 1 means no overlap)
        # We convert it to a similarity score (1 means identical, 0 means different)
        distance = cv2.compareHist(hist1, hist2, cv2.HISTCMP_BHATTACHARYYA)
        return 1.0 - distance

    def process_frame(self, image_bytes: bytes, high_res_mode: bool = False) -> Image.Image:
        """
        Ingests raw image bytes, checks scene delta, and applies token budgeting (resizing).
        Returns None if the frame is too similar to the last processed frame (Scene Delta Filtering).
        """
        # Convert bytes to cv2 image
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return None

        # Scene Delta Filtering
        if self.last_frame is not None:
            similarity = self._calculate_similarity(self.last_frame, frame)
            if similarity >= self.delta_threshold:
                # Scene hasn't changed enough, skip processing
                return None

        self.last_frame = frame.copy()

        # Dynamic Token Budgeting (Resize based on high_res_mode flag)
        max_dim = 1024 if high_res_mode else 512
        
        h, w = frame.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Convert to PIL Image for VLM consumption
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)
        
        return pil_image
