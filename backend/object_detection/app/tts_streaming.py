import asyncio
import io

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

class StreamingTTSController:
    def __init__(self, voice: str = "en-US-AriaNeural"):
        self.voice = voice

    async def stream_audio_for_text(self, text: str, pan: float = 0.0):
        """
        Generates audio for a given text and yields audio chunks asynchronously.
        `pan` (-1.0 to 1.0) is passed back with the chunk.
        """
        if not text.strip() or not HAS_EDGE_TTS:
            return

        try:
            communicate = edge_tts.Communicate(text, self.voice)
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield {
                        "type": "audio",
                        "data": chunk["data"],
                        "pan": pan
                    }
                elif chunk["type"] == "WordBoundary":
                    yield {
                        "type": "word_boundary",
                        "text": chunk["text"],
                        "offset": chunk["offset"]
                    }
        except Exception as e:
            print(f"Edge TTS Streaming Error: {e}")

    async def process_narrative_payload(self, parsed_data: dict):
        """
        Takes narrative output and streams audio for each sentence.
        """
        sentences = parsed_data.get("narrative", [])
        spatial_data = parsed_data.get("spatial_data", [])

        for i, sentence in enumerate(sentences):
            pan = 0.0
            if i < len(spatial_data):
                pan = spatial_data[i].get("pan", 0.0)

            async for chunk_info in self.stream_audio_for_text(sentence, pan):
                yield chunk_info
