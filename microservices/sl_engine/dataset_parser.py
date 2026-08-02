import numpy as np
from scipy.spatial.transform import Rotation as R

class DatasetParser:
    def __init__(self, dataset_path: str = None):
        self.dataset_path = dataset_path
        self.gloss_dict = self._load_or_mock_dataset()

    def _load_or_mock_dataset(self) -> dict:
        """
        Scans dataset directory. If none exists, builds synthetic coordinate arrays 
        (Euler angles converted to Quaternions) for the kinematic model.
        Returns a dict mapping GLOSS to a list of Keyframes (dict of joints -> quaternions).
        """
        # Mock dataset: list of keyframes per gloss. 
        # Angles in Euler (rx, ry, rz)
        mock_raw = {
            "IDLE": [
                {"rightShoulder": [0.2, 0, 0.2], "rightElbow": [0.1, 0, 0], "fingers": [0.1, 0, 0]},
            ],
            "HELLO": [
                {"rightShoulder": [0.2, 0, 0.2], "rightElbow": [0.1, 0, 0], "fingers": [0.1, 0, 0]},
                {"rightShoulder": [1.2, -0.3, -0.5], "rightElbow": [1.5, 0, 0], "fingers": [0.0, 0, 0]},
                {"rightShoulder": [1.4, -0.4, -0.6], "rightElbow": [1.6, 0, 0], "fingers": [0.0, 0, 0]},
                {"rightShoulder": [1.2, -0.3, -0.5], "rightElbow": [1.5, 0, 0], "fingers": [0.0, 0, 0]},
                {"rightShoulder": [0.2, 0, 0.2], "rightElbow": [0.1, 0, 0], "fingers": [0.1, 0, 0]},
            ],
            "NAMASTE": [
                {"rightShoulder": [0.2, 0, 0.2], "leftShoulder": [0.2, 0, -0.2], "rightElbow": [0.1, 0, 0], "leftElbow": [0.1, 0, 0]},
                {"rightShoulder": [0.8, -0.5, -0.6], "leftShoulder": [0.8, 0.5, 0.6], "rightElbow": [1.8, 0, 0], "leftElbow": [1.8, 0, 0]},
                {"rightShoulder": [0.2, 0, 0.2], "leftShoulder": [0.2, 0, -0.2], "rightElbow": [0.1, 0, 0], "leftElbow": [0.1, 0, 0]},
            ]
        }

        # Convert Euler to Quaternions (x, y, z, w) for SLERP
        converted = {}
        for gloss, frames in mock_raw.items():
            converted[gloss] = []
            for frame in frames:
                quat_frame = {}
                for joint, euler in frame.items():
                    # ZYX rotation sequence
                    quat = R.from_euler('zyx', [euler[2], euler[1], euler[0]]).as_quat()
                    quat_frame[joint] = quat.tolist()
                converted[gloss].append(quat_frame)
        return converted

    def get_keyframes(self, gloss: str) -> list:
        return self.gloss_dict.get(gloss, self.gloss_dict.get("IDLE"))

if __name__ == "__main__":
    parser = DatasetParser()
    print("HELLO Frames:", parser.get_keyframes("HELLO"))
