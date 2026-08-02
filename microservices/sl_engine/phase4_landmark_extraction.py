import cv2
import mediapipe as mp
import numpy as np
import os

class LandmarkExtractor:
    def __init__(self, input_dir="inputs", output_dir="extracted_landmarks"):
        self.input_dir = input_dir
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(
            static_image_mode=False, 
            model_complexity=1, 
            min_detection_confidence=0.5, 
            min_tracking_confidence=0.5
        )

    def process_all_videos(self):
        print(f"Phase 4: Scanning '{self.input_dir}' for MP4s...")
        if not os.path.exists(self.input_dir):
            print("No inputs directory found.")
            return

        for filename in os.listdir(self.input_dir):
            if filename.endswith(".mp4"):
                video_path = os.path.join(self.input_dir, filename)
                gloss_name = os.path.splitext(filename)[0]
                self.extract_from_video(video_path, gloss_name)

    def extract_from_video(self, video_path: str, output_name: str):
        print(f"Extracting landmarks from -> {video_path}")
        cap = cv2.VideoCapture(video_path)
        frames_data = []

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image.flags.writeable = False
            
            results = self.holistic.process(image)
            
            # Pose: 33 landmarks * 3 coords = 99
            pose = self._extract_landmarks(results.pose_landmarks, 33)
            # Face: 468 landmarks * 3 = 1404
            face = self._extract_landmarks(results.face_landmarks, 468)
            # Left Hand: 21 landmarks * 3 = 63
            lh = self._extract_landmarks(results.left_hand_landmarks, 21)
            # Right Hand: 21 landmarks * 3 = 63
            rh = self._extract_landmarks(results.right_hand_landmarks, 21)
            
            frame_coords = np.concatenate([pose, face, lh, rh])
            frames_data.append(frame_coords)

        cap.release()
        
        if frames_data:
            np_data = np.array(frames_data)
            save_path = os.path.join(self.output_dir, f"{output_name}.npy")
            np.save(save_path, np_data)
            print(f"   [+] Saved {np_data.shape[0]} frames to {save_path} (Shape: {np_data.shape})")
        else:
            print(f"   [-] Failed to extract frames for {video_path}")

    def _extract_landmarks(self, landmarks_obj, expected_length):
        if landmarks_obj:
            return np.array([[res.x, res.y, res.z] for res in landmarks_obj.landmark]).flatten()
        else:
            return np.zeros(expected_length * 3)

if __name__ == "__main__":
    extractor = LandmarkExtractor()
    extractor.process_all_videos()
    print("\nPhase 4 Landmark Extraction Complete!")
