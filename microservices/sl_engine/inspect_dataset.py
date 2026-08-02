from datasets import load_dataset

def inspect_hf_dataset(dataset_name):
    print(f"Loading dataset (STREAMING): {dataset_name}...\n")
    
    # Use streaming=True to instantly fetch the first row without downloading
    dataset = load_dataset(dataset_name, streaming=True)
    
    if 'train' in dataset:
        split_to_inspect = 'train'
    else:
        split_to_inspect = list(dataset.keys())[0]
        
    print(f"--- INSPECTING SPLIT: '{split_to_inspect}' ---")
    
    # Grab just the first row from the stream
    sample_row = next(iter(dataset[split_to_inspect]))
    
    print("--- SAMPLE DATA (Row 0) ---")
    for key, value in sample_row.items():
        if isinstance(value, list) and len(value) > 10:
            print(f"{key}: List of {len(value)} items (Truncated: {value[:5]}...)")
        elif isinstance(value, str) and len(value) > 200:
            print(f"{key}: {value[:200]}... (Truncated)")
        else:
            print(f"{key}: {value}")

if __name__ == "__main__":
    inspect_hf_dataset("bridgeconn/sign-dictionary-isl")
