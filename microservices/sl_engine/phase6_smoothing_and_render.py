import cv2
import numpy as np
import os
from scipy.signal import savgol_filter

class SmoothingAndRendering:
    def __init__(self, window_length=15, polyorder=3):
        self.window_length = window_length
        self.polyorder = polyorder
        self.width = 800
        self.height = 800

    def apply_temporal_smoothing(self, concatenated_motion: np.ndarray) -> np.ndarray:
        print("Phase 6: Applying Temporal Smoothing (Savitzky-Golay Filter)")
        num_frames = concatenated_motion.shape[0]
        
        # Ensure window length is valid for the sequence size
        if num_frames < self.window_length:
            print("Warning: Sequence too short for smoothing. Returning raw coordinates.")
            return concatenated_motion

        # Smooth along axis 0 (time dimension)
        smoothed_motion = savgol_filter(
            concatenated_motion, 
            window_length=self.window_length, 
            polyorder=self.polyorder, 
            axis=0
        )
        return smoothed_motion

    def render_opencv(self, smoothed_motion: np.ndarray):
        print("Phase 6: Rendering output to OpenCV Window! Press 'q' to close the window.")
        
        for frame_idx, frame_data in enumerate(smoothed_motion):
            canvas = np.zeros((self.height, self.width, 3), dtype=np.uint8)
            
            num_landmarks = len(frame_data) // 3
            if num_landmarks == 0:
                continue
                
            landmarks = frame_data.reshape((num_landmarks, 3))
            
            # Draw landmarks scaled to window dimensions
            for i, lm in enumerate(landmarks):
                # The raw landmarks are normalized [0.0 - 1.0]. Z is depth, not used in 2D plot.
                x_px = int(lm[0] * self.width)
                y_px = int(lm[1] * self.height)
                
                # Different colors for Pose vs Hands vs Face
                if i < 33: # Pose
                    color = (255, 0, 0)
                elif i < 33 + 468: # Face
                    color = (50, 50, 50)
                else: # Hands
                    color = (0, 255, 255)
                    
                # Skip 0,0 which means the landmark was not detected
                if x_px > 0 and y_px > 0:
                    cv2.circle(canvas, (x_px, y_px), 3, color, -1)

            cv2.putText(canvas, f"Sign Output Sequence | Frame: {frame_idx}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            cv2.imshow("Sign Language Prototyping - AI Avatar Rig", canvas)
            
            if cv2.waitKey(33) & 0xFF == ord('q'):
                print("User terminated the visualization.")
                break

        cv2.destroyAllWindows()

if __name__ == "__main__":
    renderer = SmoothingAndRendering(window_length=15, polyorder=3)
    
    input_file = "final_assembled_motion.npy"
    if os.path.exists(input_file):
        motion = np.load(input_file)
        print(f"Loaded concatenated motion: {motion.shape}")
        
        smoothed = renderer.apply_temporal_smoothing(motion)
        renderer.render_opencv(smoothed)
    else:
        print(f"Error: {input_file} not found. Please run Phase 5 first.")
    
    print("\nFull Pipeline Executed Successfully!")
