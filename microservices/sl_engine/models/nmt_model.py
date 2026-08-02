import torch
import torch.nn as nn

class SignGlossNMTTransformer(nn.Module):
    """
    Neural Machine Translation Model (Transformer) 
    Translates English Text tokens to Sign Language Gloss tokens.
    """
    def __init__(self, vocab_size, d_model=512, nhead=8, num_layers=6):
        super(SignGlossNMTTransformer, self).__init__()
        
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.transformer = nn.Transformer(
            d_model=d_model,
            nhead=nhead,
            num_encoder_layers=num_layers,
            num_decoder_layers=num_layers
        )
        self.fc_out = nn.Linear(d_model, vocab_size)

    def forward(self, src, tgt):
        # src: [seq_len, batch_size]
        # tgt: [seq_len, batch_size]
        
        src_emb = self.embedding(src)
        tgt_emb = self.embedding(tgt)
        
        # In practice, you must generate a target mask to prevent looking ahead
        out = self.transformer(src_emb, tgt_emb)
        out = self.fc_out(out)
        
        return out
