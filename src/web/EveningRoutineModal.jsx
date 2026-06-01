import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

/**
 * Evening Routine Modal - 9 PM+
 * Asks: mood, what did you accomplish today
 * Saves for next morning's AI task generation
 */
export function EveningRoutineModal({
  onComplete,
  previousMood = null,
  onSaveMood
}) {
  const [step, setStep] = useState('mood'); // mood -> summary -> done
  const [mood, setMood] = useState(5);
  const [accomplished, setAccomplished] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  const handleMoodSubmit = () => {
    if (step === 'mood') setStep('summary');
  };

  const handleSummarySubmit = () => {
    // Save mood event and summary
    onSaveMood?.({
      mood,
      accomplished,
      notes
    });
    setSaved(true);
    setTimeout(() => {
      setStep('done');
    }, 500);
  };

  return (
    <section className="card routine-panel evening-routine-panel">
      <div className="modal-header">
        <h2>Evening Review 🌙</h2>
        <button className="button button-secondary button-sm" onClick={onComplete} type="button">
          <FiX size={20} />
        </button>
      </div>

        {step === 'mood' && (
          <div className="routine-step">
            <h3>How was your day?</h3>
            <div className="mood-picker">
              <input
                type="range"
                min="1"
                max="10"
                value={mood}
                onChange={(e) => setMood(Number(e.target.value))}
                className="mood-slider"
              />
              <div className="mood-display">
                <span className="mood-number">{mood}</span>
                <span className="mood-label">
                  {mood <= 3 ? '😞 Rough' : mood <= 6 ? '😐 Okay' : mood <= 8 ? '😊 Good' : '🚀 Excellent'}
                </span>
              </div>
            </div>
            <button className="button button-primary" onClick={handleMoodSubmit}>
              Next
            </button>
          </div>
        )}

        {step === 'summary' && (
          <div className="routine-step">
            <h3>What did you accomplish today?</h3>
            <textarea
              value={accomplished}
              onChange={(e) => setAccomplished(e.target.value)}
              placeholder="E.g., 'Finished the dashboard, reviewed 3 PRs, wrote tests for auth module'"
              className="routine-textarea"
              rows={4}
            />
            <h4 style={{ marginTop: 'var(--space-lg)' }}>Anything blocking progress?</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: What slowed you down? What do you need tomorrow?"
              className="routine-textarea"
              rows={2}
            />
            <div className="button-group">
              <button className="button button-secondary" onClick={() => setStep('mood')}>
                Back
              </button>
              <button
                className="button button-primary"
                onClick={handleSummarySubmit}
                disabled={!accomplished.trim()}
              >
                {saved ? '✓ Saved' : 'Save Review'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="routine-step routine-complete">
            <div className="complete-icon">🌟</div>
            <h3>Great work today!</h3>
            <p className="text-secondary">Your mood and accomplishments are saved. Tomorrow morning, the AI will use this to generate your tasks.</p>
            <button className="button button-primary" onClick={onComplete}>
              Rest Well
            </button>
          </div>
        )}
    </section>
  );
}

export default EveningRoutineModal;
