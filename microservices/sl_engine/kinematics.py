import numpy as np
from scipy.spatial.transform import Rotation as R, Slerp

class KinematicsEngine:
    def __init__(self, fps: int = 60):
        self.fps = fps

    def _interpolate_joint(self, times, quats, query_times):
        """
        Interpolates quaternions using SLERP.
        """
        if len(times) == 1:
            return [quats[0].tolist()] * len(query_times)
            
        rotations = R.from_quat(quats)
        slerp = Slerp(times, rotations)
        interpolated_rotations = slerp(query_times)
        return interpolated_rotations.as_quat().tolist()

    def generate_animation_matrices(self, keyframes: list, duration_sec: float = 1.0) -> list:
        """
        Takes a list of keyframe dictionaries and interpolates them across the specified duration.
        Returns a list of dicts (one per frame) mapping joints to quaternions (x, y, z, w).
        """
        if not keyframes:
            return []

        num_frames = int(duration_sec * self.fps)
        query_times = np.linspace(0, duration_sec, num_frames)
        
        # Keyframe original times (assume evenly spaced)
        original_times = np.linspace(0, duration_sec, len(keyframes))

        # Collect data per joint
        joint_data = {}
        for frame in keyframes:
            for joint, quat in frame.items():
                if joint not in joint_data:
                    joint_data[joint] = []
                joint_data[joint].append(quat)

        # Ensure all joints exist in all frames by carrying over previous states (simplified IK fallback)
        for joint, quats in joint_data.items():
            if len(quats) < len(keyframes):
                # Fallback: pad with the last known rotation or identity
                while len(quats) < len(keyframes):
                    quats.append(quats[-1] if quats else [0, 0, 0, 1])

        # Interpolate
        frame_sequence = [{} for _ in range(num_frames)]
        for joint, quats in joint_data.items():
            interpolated_quats = self._interpolate_joint(original_times, quats, query_times)
            for frame_idx, i_quat in enumerate(interpolated_quats):
                frame_sequence[frame_idx][joint] = i_quat

        return frame_sequence

if __name__ == "__main__":
    engine = KinematicsEngine(fps=10)
    # Test SLERP
    mock_frames = [
        {"rightShoulder": [0, 0, 0, 1]},
        {"rightShoulder": [0, 0.707, 0, 0.707]}
    ]
    frames = engine.generate_animation_matrices(mock_frames, 0.5)
    print(f"Generated {len(frames)} frames.")
