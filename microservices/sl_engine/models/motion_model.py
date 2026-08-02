import torch
import torch.nn as nn

class GlossToMotionLSTM(nn.Module):
    """
    Time-Series LSTM Model
    Maps a sequence of Gloss embeddings to a continuous sequence of 3D spatial coordinate matrices.
    """
    def __init__(self, gloss_vocab_size, embedding_dim=256, hidden_dim=512, num_joints=21, output_dim=3):
        super(GlossToMotionLSTM, self).__init__()
        
        self.num_joints = num_joints
        self.output_dim = output_dim # 3 for xyz, 4 for quaternions
        
        self.embedding = nn.Embedding(gloss_vocab_size, embedding_dim)
        
        # LSTM layer to process temporal dependencies
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, num_layers=3, batch_first=True)
        
        # Linear layer projecting hidden state to the coordinate matrix
        self.fc_out = nn.Linear(hidden_dim, num_joints * output_dim)

    def forward(self, x):
        # x: [batch_size, seq_len]
        emb = self.embedding(x)
        
        lstm_out, _ = self.lstm(emb)
        
        out = self.fc_out(lstm_out)
        
        # Reshape to [batch_size, seq_len, num_joints, output_dim]
        out = out.view(x.size(0), x.size(1), self.num_joints, self.output_dim)
        return out
