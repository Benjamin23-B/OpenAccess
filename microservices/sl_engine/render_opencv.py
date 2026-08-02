import cv2
import numpy as np

class OpenCVSkeletalRenderer:
    def __init__(self, width=800, height=800):
        self.width = width
        self.height = height
        
        # Define mock connections between joints (for visualization)
        # Assuming joint 0 is head, 1 is neck, 2 is right shoulder, etc.
        self.connections = [
            (0, 1), (1, 2), (1, 3), # Neck to shoulders
            (2, 4), (4, 6),         # Right arm
            (3, 5), (5, 7)          # Left arm
        ]

    def render_frame(self, coordinate_frame: np.ndarray, wait_time: int = 30):
        """
        Renders a single frame of skeletal landmarks on a blank canvas.
        Args:
            coordinate_frame: np.ndarray shape [num_joints, 2 or 3]
        """
        # Create a blank black canvas
        canvas = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # Map normalized coordinates (-1 to 1) to canvas pixels
        def to_pixel(val, size):
            return int((val + 1.0) / 2.0 * size)

        # Draw bones
        for start_idx, end_idx in self.connections:
            if start_idx < len(coordinate_frame) and end_idx < len(coordinate_frame):
                pt1 = (
                    to_pixel(coordinate_frame[start_idx, 0], self.width),
                    to_pixel(coordinate_frame[start_idx, 1], self.height)
                )
                pt2 = (
                    to_pixel(coordinate_frame[end_idx, 0], self.width),
                    to_pixel(coordinate_frame[end_idx, 1], self.height)
                )
                cv2.line(canvas, pt1, pt2, (0, 255, 0), 2)

        # Draw joints
        for pt in coordinate_frame:
            px = to_pixel(pt[0], self.width)
            py = to_pixel(pt[1], self.height)
            cv2.circle(canvas, (px, py), 5, (0, 0, 255), -1)

        cv2.imshow("Sign Language Prototyping - OpenCV", canvas)
        if cv2.waitKey(wait_time) & 0xFF == ord('q'):
            cv2.destroyAllWindows()
            exit(0)

if __name__ == "__main__":
    renderer = OpenCVSkeletalRenderer()
    # Dummy mock animation
    for i in range(100):
        dummy_frame = np.random.uniform(-0.5, 0.5, (10, 3))
        renderer.render_frame(dummy_frame, wait_time=50)
