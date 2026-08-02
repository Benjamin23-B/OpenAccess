import re

class GlossTokenizer:
    def __init__(self):
        # Stop words that are typically dropped in ASL/ISL structure
        self.stop_words = {"is", "are", "am", "was", "were", "be", "being", "been", "a", "an", "the", "of", "to", "in"}
        
        # Simple lemma mappings (extremely simplified for demonstration)
        self.lemma_map = {
            "hello": "hello",
            "hi": "hello",
            "namaste": "namaste",
            "thanks": "thankyou",
            "thank": "thankyou",
            "please": "please",
            "help": "help",
            "helping": "help",
        }

    def tokenize(self, sentence: str) -> list[str]:
        """
        Maps a standard English sentence to a sequence of root sign glosses.
        """
        # Lowercase and remove punctuation
        clean_text = re.sub(r'[^\w\s]', '', sentence.lower())
        tokens = clean_text.split()
        
        gloss_sequence = []
        for token in tokens:
            if token in self.stop_words:
                continue
            
            # Map to root lemma if known, otherwise spell it out or pass verbatim
            gloss = self.lemma_map.get(token, token)
            gloss_sequence.append(gloss.upper())
            
        return gloss_sequence

if __name__ == "__main__":
    tokenizer = GlossTokenizer()
    print("Test:", tokenizer.tokenize("Hello, how are you? Please help!"))
