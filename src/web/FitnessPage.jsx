import React, { useState, useEffect } from 'react';
import { loadJSON, saveJSON, uid } from './storage.js';

const WORKOUTS_KEY = 'workouts';

export default function FitnessPage({ onAddWorkout }) {
  const [workouts, setWorkouts] = useState(() => loadJSON(WORKOUTS_KEY, []));
  const [exercise, setExercise] = useState('');

  useEffect(() => {
    setWorkouts(loadJSON(WORKOUTS_KEY, []));
  }, []);

  async function addQuick() {
    const name = (exercise || '').trim();
    if (!name) return;
    const w = { id: uid('w'), exercise: name, sets: [{ reps: 5, weight: 0 }], date: new Date().toISOString() };
    const arr = [w, ...workouts];
    saveJSON(WORKOUTS_KEY, arr);
    setWorkouts(arr);
    setExercise('');
    if (onAddWorkout) await onAddWorkout();
  }

  return (
    <div className="page fitness-page">
      <h2>Fitness</h2>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="Exercise name (e.g., Squat)" value={exercise} onChange={e=>setExercise(e.target.value)} style={{ padding:8, width:'70%' }} />
        <button className="button button-primary" onClick={addQuick} style={{ marginLeft: 8 }}>Log</button>
      </div>

      <div>
        {workouts.length === 0 ? (
          <p className="text-muted">No workouts yet.</p>
        ) : (
          workouts.map(w => (
            <div key={w.id} className="card small-card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>{w.exercise} — {new Date(w.date).toLocaleDateString()}</div>
                <div>{(w.sets || []).length} sets</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
