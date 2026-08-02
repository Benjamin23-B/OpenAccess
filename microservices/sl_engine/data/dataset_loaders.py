import torch
from torch.utils.data import Dataset, DataLoader

class SignLanguageNMTDataset(Dataset):
    """
    Dataset loader for Neural Machine Translation: English Text -> Sign Gloss
    """
    def __init__(self, text_data: list, gloss_data: list):
        self.text_data = text_data
        self.gloss_data = gloss_data
        
    def __len__(self):
        return len(self.text_data)

    def __getitem__(self, idx):
        # Tokenize and return tensors (Placeholder)
        return {"text": self.text_data[idx], "gloss": self.gloss_data[idx]}

class MotionCoordinateDataset(Dataset):
    """
    Dataset loader for mapping Sign Gloss tokens to 3D spatial coordinate time-series matrices.
    """
    def __init__(self, gloss_tokens: list, coordinate_matrices: list):
        self.gloss_tokens = gloss_tokens
        # Expected shape: [num_samples, seq_length, num_joints, 3] (or quaternion 4)
        self.coordinate_matrices = coordinate_matrices

    def __len__(self):
        return len(self.gloss_tokens)

    def __getitem__(self, idx):
        return {"gloss": self.gloss_tokens[idx], "coordinates": self.coordinate_matrices[idx]}
