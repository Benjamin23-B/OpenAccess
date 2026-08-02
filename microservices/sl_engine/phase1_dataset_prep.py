import os
import json
import re
from datasets import load_dataset, Value

class DatasetPreprocessor:
    def __init__(self, download_limit=5, output_dir="inputs"):
        self.download_limit = download_limit
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def normalize_english(self, text: str) -> str:
        clean_text = re.sub(r'[^\w\s]', '', text.lower())
        return clean_text.strip()

    def normalize_gloss(self, gloss: str) -> str:
        clean_gloss = re.sub(r'[^\w\s]', '', gloss)
        clean_gloss = re.sub(r'^\d+_', '', clean_gloss)
        return clean_gloss.strip().upper()

    def prepare_dataset(self):
        print("Phase 1: Streaming dataset 'bridgeconn/sign-dictionary-isl' from HuggingFace...")
        
        # Load dataset and CAST the 'mp4' column to pure binary to prevent torchcodec decoding
        dataset = load_dataset("bridgeconn/sign-dictionary-isl", streaming=True)
        # Using map or cast_column if possible on IterableDataset
        dataset = dataset.cast_column("mp4", Value("binary"))
        
        parallel_dataset = []
        count = 0
        
        for item in dataset['train']:
            if count >= self.download_limit:
                break
                
            raw_key = item.get("__key__", f"SIGN_{count}")
            gloss = raw_key.split('/')[-1] if '/' in raw_key else raw_key
            normalized_gloss = self.normalize_gloss(gloss)
            
            meta_json = item.get("json", {})
            transcript = meta_json.get("transcript", {})
            english_text = transcript.get("text", "")
            
            if not english_text:
                english_text = normalized_gloss.lower()
                
            normalized_en = self.normalize_english(english_text)
            
            parallel_dataset.append({
                "source": normalized_en,
                "target": normalized_gloss
            })
            
            mp4_data = item.get("mp4")
            if mp4_data:
                video_path = os.path.join(self.output_dir, f"{normalized_gloss}.mp4")
                with open(video_path, "wb") as f:
                    if isinstance(mp4_data, dict) and "bytes" in mp4_data:
                        f.write(mp4_data["bytes"])
                    else:
                        f.write(mp4_data)
                print(f"Downloaded video -> {video_path}")
            
            count += 1
            
        with open("parallel_isl_dataset.json", "w") as f:
            json.dump(parallel_dataset, f, indent=4)
            
        print(f"\nPrepared {len(parallel_dataset)} parallel sentence pairs.")
        print(f"Saved dataset JSON to 'parallel_isl_dataset.json'")

if __name__ == "__main__":
    prep = DatasetPreprocessor(download_limit=5)
    prep.prepare_dataset()
