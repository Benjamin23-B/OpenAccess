import json
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import T5Tokenizer, T5ForConditionalGeneration, AdamW

class ISLDataset(Dataset):
    def __init__(self, file_path, tokenizer, max_length=128):
        with open(file_path, "r") as f:
            self.data = json.load(f)
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        
        # T5 expects a task prefix
        source = "translate English to ISL Gloss: " + item["source"]
        target = item["target"]

        # Tokenize source
        source_tokens = self.tokenizer(
            source, max_length=self.max_length, padding="max_length", truncation=True, return_tensors="pt"
        )
        # Tokenize target
        target_tokens = self.tokenizer(
            target, max_length=self.max_length, padding="max_length", truncation=True, return_tensors="pt"
        )

        labels = target_tokens.input_ids.squeeze()
        # Replace padding token id with -100 so it's ignored by the CrossEntropy loss function
        labels[labels == self.tokenizer.pad_token_id] = -100

        return {
            "input_ids": source_tokens.input_ids.squeeze(),
            "attention_mask": source_tokens.attention_mask.squeeze(),
            "labels": labels
        }

def train_model():
    print("Phase 2: Transfer Learning Initialization (T5-Small)")
    tokenizer = T5Tokenizer.from_pretrained("t5-small")
    model = T5ForConditionalGeneration.from_pretrained("t5-small")
    
    # Use GPU if available
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    print("Phase 3: Fine-Tuning for ISL Grammar (Teacher Forcing)")
    # Load the parallel dataset generated from Phase 1
    dataset = ISLDataset("parallel_isl_dataset.json", tokenizer)
    dataloader = DataLoader(dataset, batch_size=4, shuffle=True)

    optimizer = AdamW(model.parameters(), lr=5e-5)
    
    model.train()
    epochs = 3
    
    for epoch in range(epochs):
        total_loss = 0
        for batch in dataloader:
            optimizer.zero_grad()
            
            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            # T5ForConditionalGeneration handles Teacher Forcing automatically when 'labels' are provided
            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs} | Loss: {total_loss/len(dataloader):.4f}")

    print("Saving fine-tuned model...")
    model.save_pretrained("./isl_nmt_model")
    tokenizer.save_pretrained("./isl_nmt_model")

if __name__ == "__main__":
    train_model()
