import numpy as np
from scipy.signal import savgol_filter

class MotionSmoother:
    def __init__(self, window_length=5, polyorder=2):
        self.window_length = window_length
        self.polyorder = polyorder

    def smooth_coordinates(self, coordinate_matrix: np.ndarray) -> np.ndarray:
        """
        Applies a Savitzky-Golay filter to smooth the generated sequence interpolation.
        
        Args:
            coordinate_matrix (np.ndarray): Shape [seq_len, num_joints, 3]
            
        Returns:
            np.ndarray: Smoothed coordinate matrix of the same shape.
        """
        seq_len, num_joints, dims = coordinate_matrix.shape
        
        # If sequence is too short for the window, return original
        if seq_len < self.window_length:
            return coordinate_matrix

        smoothed = np.zeros_like(coordinate_matrix)
        
        # Apply SavGol filter across the time dimension for each joint and each axis
        for joint in range(num_joints):
            for dim in range(dims):
                smoothed[:, joint, dim] = savgol_filter(
                    coordinate_matrix[:, joint, dim], 
                    window_length=self.window_length, 
                    polyorder=self.polyorder
                )
                
        return smoothed
