import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { callAi, cleanJson } from './logic.js';

/**
 * Morning Routine Modal
 * Asks user about mood, yesterday's progress, generates tasks via Groq
 */
export function MorningRoutineModal({
  onComplete,
  projects = [],
  currentTasks = [],
  aiConfig = {},
  onAddNewTasks
}) {
  const [step, setStep] = useState('mood'); // mood -> summary -> preview -> done
  const [mood, setMood] = useState(5);
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleMoodSubmit = () => {
    if (step === 'mood') setStep('summary');
  };

  const handleSummarySubmit = async () => {
    if (step === 'summary') {
      // Generate tasks via Groq
      setIsGenerating(true);
      setError('');
      
      try {
        // Improved prompt with examples and contextual info to reduce generic outputs
        const prompt = `You are a calm, practical productivity assistant. Your job is to generate 3-6 clearly actionable, atomic tasks the user can complete today. Output EXACTLY one JSON array and NOTHING else.

Context:
- Yesterday summary: "${summary}"
- User mood (1-10): ${mood}
- Notes: "${notes}"
- Active projects (name : goal):\n${projects.slice(0, 8).map(p => `- ${p.name}: ${p.goal || ''}`).join('\n')}
- Current todo count: ${currentTasks.length}

Rules (must follow):
1) Produce 3-6 tasks; each task must be independently useful and completable in <60 minutes.
2) Prefer tasks that directly follow from "Yesterday summary" and the listed project goals.
3) If mood <=4, bias toward 1-2 lighter tasks (short, low-effort) and 1 focused item.
4) Use project names for projectId when applicable; use null if not tied to a project.
5) Include for each task: title (clear), priority (1-10), estimatedMinutes (integer), projectId (string|null), acceptanceCriteria (one short sentence) and a short rationale (1 sentence).
6) Do NOT include any prose, explanation, or markdown — ONLY the JSON array.

Output schema for each item:
{
  "title": "...",
  "priority": 1-10,
  "estimatedMinutes": 10-60,
  "projectId": "Project Name" or null,
  "acceptanceCriteria": "What counts as done",
  "rationale": "Why this helps today"
}

Examples (strict outputs):
Example 1 input: Yesterday I prototyped login UI. Mood 7. Project: Auth: "Implement login and signup"
Example 1 output:
[ { "title": "Add client-side validation to login form", "priority": 7, "estimatedMinutes": 30, "projectId": "Auth", "acceptanceCriteria": "Login form shows inline validation and prevents submission when invalid.", "rationale": "Prevents bad submits and reduces backend errors." } ]

Example 2 input: Yesterday I felt blocked by API errors. Mood 3. Project: API: "Stabilize payments API"
Example 2 output:
[ { "title": "Run payment API smoke tests and note 2 failures", "priority": 6, "estimatedMinutes": 40, "projectId": "API", "acceptanceCriteria": "Smoke tests complete and 2 failing cases recorded in notes.", "rationale": "Turns vague blockers into concrete issues to address." } ]

Now, using the context above (yesterday summary, mood, projects, current tasks), generate a JSON array of 3-6 tasks for today that follow these rules.`;

        const response = await callAi(prompt, aiConfig);
        
        if (!response) {
          throw new Error('No response from AI');
        }

        // Extract text from response object
        const responseText = typeof response === 'string' ? response : response.text || '';
        
        if (!responseText) {
          throw new Error('Empty response from AI');
        }

        // Parse response using robust cleaner
        let tasks = [];
        try {
          tasks = cleanJson(responseText);
          if (!Array.isArray(tasks)) throw new Error('AI returned non-array JSON');
        } catch (parseError) {
          console.error('Parse error:', parseError, 'Response:', responseText);
          throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }

        setGeneratedTasks(tasks);
        setStep('preview');
      } catch (err) {
        setError(`Failed to generate tasks: ${err.message}`);
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleTasksConfirm = () => {
    // Add generated tasks
    const today = new Date().toISOString().split('T')[0];
    const newTasks = generatedTasks.map((t, idx) => ({
      id: `task-${Date.now()}-${idx}`,
      title: t.title,
      date: today,
      completed: false,
      priority: t.priority || 5,
      estimatedMinutes: t.estimatedMinutes || 30,
      projectId: t.projectId || null,
      createdBy: 'ai-morning-routine'
    }));

    onAddNewTasks?.(newTasks);
    setStep('done');
  };

  return (
    <div className="modal-overlay">
      <div className="modal morning-routine-modal">
        <div className="modal-header">
          <h2>Good Morning! ☀️</h2>
          <button className="button button-secondary button-sm" onClick={onComplete}>
            <FiX size={20} />
          </button>
        </div>

        {step === 'mood' && (
          <div className="morning-step">
            <h3>How are you feeling today?</h3>
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
                  {mood <= 3 ? '😞 Not great' : mood <= 6 ? '😐 Neutral' : mood <= 8 ? '😊 Good' : '🚀 Excellent'}
                </span>
              </div>
            </div>
            <button className="button button-primary" onClick={handleMoodSubmit}>
              Next
            </button>
          </div>
        )}

        {step === 'summary' && (
          <div className="morning-step">
            <h3>What did you accomplish yesterday?</h3>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="E.g., 'Finished the login flow, wrote documentation, reviewed PRs'"
              className="morning-textarea"
              rows={4}
            />
            <h4 style={{ marginTop: 'var(--space-lg)' }}>Any blockers or notes?</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional: What slowed you down? What do you want to focus on?"
              className="morning-textarea"
              rows={3}
            />
            {error && <div className="error-message">{error}</div>}
            <div className="button-group">
              <button className="button button-secondary" onClick={() => setStep('mood')}>
                Back
              </button>
              <button
                className="button button-primary"
                onClick={handleSummarySubmit}
                disabled={isGenerating || !summary.trim()}
              >
                {isGenerating ? 'Generating...' : 'Generate My Tasks'}
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="morning-step">
            <h3>Your Tasks for Today</h3>
            <p className="text-secondary">AI generated these based on your mood and yesterday's progress.</p>
            <div className="generated-tasks">
              {generatedTasks.map((task, idx) => (
                <div key={idx} className="generated-task-item">
                  <div className="task-info">
                    <h4>{task.title}</h4>
                    <div className="task-meta">
                      <span className="badge">
                        {task.estimatedMinutes} min
                      </span>
                      {task.projectId && (
                        <span className="badge">
                          {task.projectId}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="task-priority">
                    <span className={`priority-indicator priority-${task.priority}`}>
                      Priority: {task.priority}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="button-group">
              <button className="button button-secondary" onClick={() => setStep('summary')}>
                Back
              </button>
              <button className="button button-primary" onClick={handleTasksConfirm}>
                Add These Tasks
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="morning-step morning-complete">
            <div className="complete-icon">✨</div>
            <h3>Ready to go!</h3>
            <p className="text-secondary">Your tasks are added. Focus on the Next Best Action first.</p>
            <button className="button button-primary" onClick={onComplete}>
              Start Your Day
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MorningRoutineModal;
