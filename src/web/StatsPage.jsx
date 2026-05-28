import React from 'react';

export default function StatsPage({ stats }) {
  if (!stats) return (<div className="page stats-page"><h2>Stats</h2><p className="text-muted">No stats available yet.</p></div>);
  return (
    <div className="page stats-page">
      <h2>Stats</h2>
      <div className="card small-card">
        <div><strong>Weekly</strong></div>
        <div>Tasks: {stats.weekly?.totalTasks ?? 0}</div>
        <div>Completed: {stats.weekly?.completedTasks ?? 0}</div>
        <div>Focus (min): {Math.round(stats.weekly?.focus ?? 0)}</div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card small-card">
        <div><strong>Monthly</strong></div>
        <div>Tasks: {stats.monthly?.totalTasks ?? 0}</div>
        <div>Completed: {stats.monthly?.completedTasks ?? 0}</div>
      </div>
    </div>
  );
}
