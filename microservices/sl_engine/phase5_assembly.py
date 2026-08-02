import numpy as np
import os

class MotionAssembler:
    def __init__(self, landmarks_dir="extracted_landmarks"):
        self.landmarks_dir = landmarks_dir

    def assemble_motion(self, gloss_sequence: str) -> np.ndarray:
        print(f"Phase 5: Assembling Motion for Gloss Sequence -> {gloss_sequence}")
        gloss_tokens = gloss_sequence.split()
        
        assembled_frames = []
        
        for token in gloss_tokens:
            file_path = os.path.join(self.landmarks_dir, f"{token}.npy")
            
            if os.path.exists(file_path):
                sign_frames = np.load(file_path)
                assembled_frames.append(sign_frames)
            else:
                print(f"Warning: Landmark file for '{token}' not found at {file_path}. Skipping.")
                
        if assembled_frames:
            final_motion = np.concatenate(assembled_frames, axis=0)
            print(f"Assembly complete. Total concatenated frames: {final_motion.shape[0]}")
            return final_motion
        else:
            return np.array([])

if __name__ == "__main__":
    assembler = MotionAssembler()
    # Testing the assembly with the first two dictionary entries we downloaded
    motion_matrix = assembler.assemble_motion("1 10")
    if motion_matrix.size > 0:
        np.save("final_assembled_motion.npy", motion_matrix)
        print("Saved assembled motion to final_assembled_motion.npy")
