'use client';

import React, { useState } from 'react';
import { SpeechBridge } from '../services/speechBridge';

interface AACBoardProps {
  speechBridge: SpeechBridge | null;
}

const COMMON_WORDS = [
  'I', 'You', 'Want', 'Need', 'Help', 'Yes', 'No', 
  'More', 'Stop', 'Go', 'Eat', 'Drink', 'Please', 'Thank you'
];

export default function AACBoard({ speechBridge }: AACBoardProps) {
  const [sentence, setSentence] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<string[]>([]);

  // Mock next-word prediction based on current sentence
  const updatePredictions = (currentSentence: string[]) => {
    // In a real implementation, this would query the TFLite next-word prediction model
    if (currentSentence.length === 0) {
      setPredictions(['I', 'Can', 'Do', 'What']);
    } else if (currentSentence[currentSentence.length - 1].toLowerCase() === 'i') {
      setPredictions(['want', 'need', 'feel', 'am']);
    } else if (currentSentence[currentSentence.length - 1].toLowerCase() === 'want') {
      setPredictions(['to', 'food', 'water', 'help']);
    } else {
      setPredictions([]);
    }
  };

  const handleWordClick = (word: string) => {
    const newSentence = [...sentence, word];
    setSentence(newSentence);
    updatePredictions(newSentence);
    
    // Speak the word immediately for auditory feedback
    if (speechBridge) {
      speechBridge.speak(word);
    }
  };

  const handleSpeakSentence = () => {
    const fullSentence = sentence.join(' ');
    if (speechBridge && fullSentence) {
      speechBridge.speak(fullSentence);
    }
  };

  const handleClear = () => {
    setSentence([]);
    updatePredictions([]);
  };

  return (
    <div className="aac-board" style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '10px' }}>
      <div className="sentence-display" style={{ marginBottom: '20px', minHeight: '50px', backgroundColor: 'white', padding: '10px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <strong>Current:</strong> {sentence.join(' ')}
      </div>

      <div className="controls" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={handleSpeakSentence} style={btnStyle('#4CAF50')}>Speak Sentence</button>
        <button onClick={handleClear} style={btnStyle('#f44336')}>Clear</button>
        <button onClick={() => setSentence(sentence.slice(0, -1))} style={btnStyle('#ff9800')}>Backspace</button>
      </div>

      {predictions.length > 0 && (
        <div className="predictions" style={{ marginBottom: '20px' }}>
          <h4>Predictions:</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {predictions.map(word => (
              <button key={word} onClick={() => handleWordClick(word)} style={btnStyle('#2196F3')}>{word}</button>
            ))}
          </div>
        </div>
      )}

      <div className="symbol-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
        {COMMON_WORDS.map(word => (
          <button key={word} onClick={() => handleWordClick(word)} style={{...btnStyle('#e0e0e0'), color: 'black', height: '80px'}}>
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}

const btnStyle = (bgColor: string): React.CSSProperties => ({
  padding: '10px 15px',
  backgroundColor: bgColor,
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontWeight: 'bold'
});
