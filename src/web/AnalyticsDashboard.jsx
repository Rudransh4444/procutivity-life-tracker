import React, { useMemo, useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FiTrendingUp, FiCheck, FiCalendar, FiChevronRight, FiPlus, FiZap } from 'react-icons/fi';
import { HiOutlineFire } from 'react-icons/hi';

/**
 * Analytics Dashboard - Primary screen
 * Displays: Productivity score, mood trend, task list, site analytics
 */
export function AnalyticsDashboard({
  tasks = [],
  projects = [],
  moodTrend = [],
  productivityMetrics = [],
  awData = [],
  todayMood = null,
  onAddTask,
  onCheckInMorning,
  onCompleteTask,
  onSelectTask
}) {
  const today = new Date().toISOString().split('T')[0];

  // Calculate today's productivity score
  const todaysTasks = tasks.filter(t => t.date === today);
  const completedToday = todaysTasks.filter(t => t.completed).length;
  const todayMoodScore = todayMood?.score || 5;

  const todaysScore = useMemo(() => {
    let score = 0;
    score += Math.min(completedToday * 10, 50);
    score += Math.min(Math.floor(30), 20); // Focus time placeholder
    score += (todayMoodScore >= 7 ? 15 : todayMoodScore >= 4 ? 10 : 5);
    return Math.min(Math.floor(score), 100);
  }, [completedToday, todayMoodScore]);

  // Get next best action
  const nextBestAction = useMemo(() => {
    const uncompletedToday = todaysTasks
      .filter(t => !t.completed)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return uncompletedToday[0] || null;
  }, [todaysTasks]);

  // Calculate progress for active projects
  const activeProjects = useMemo(() => {
    return projects
      .filter(p => !p.completed)
      .map(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const completed = projectTasks.filter(t => t.completed).length;
        const total = projectTasks.length || 1;
        return {
          ...p,
          progress: Math.floor((completed / total) * 100),
          tasksCompleted: completed,
          tasksTotal: total
        };
      })
      .sort((a, b) => b.progress - a.progress);
  }, [tasks, projects]);

  // Process ActivityWatch data
  const topSites = useMemo(() => {
    if (!awData || awData.length === 0) return [];
    
    return awData
      .sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0))
      .slice(0, 8)
      .map(site => {
        const domain = new URL(`https://${site.url}`).hostname;
        const isProductive = ['github.com', 'docs.google.com', 'figma.com', 'stackoverflow.com'].some(
          prod => domain.includes(prod)
        );
        const isDistraction = ['youtube.com', 'x.com', 'reddit.com', 'instagram.com'].some(
          dist => domain.includes(dist)
        );
        
        return {
          domain,
          duration: site.duration_minutes || 0,
          type: isProductive ? 'productive' : isDistraction ? 'distraction' : 'neutral'
        };
      });
  }, [awData]);

  // Weekly stats summary (optional)
  const weeklySummary = useMemo(() => {
    if (!stats || !stats.weekly) return null;
    return {
      tasksTotal: stats.weekly.totalTasks || 0,
      completed: stats.weekly.completedTasks || 0,
      focus: stats.weekly.focus || 0
    };
  }, [stats]);

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="greeting">
          <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</h1>
          <p className="text-secondary">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Productivity Score Card */}
      <div className="card productivity-score-card">
        <div className="score-main">
          <div className="score-number">
            <div className="score-circle">
              {todaysScore}
            </div>
            <div className="score-label">Productivity Score</div>
          </div>
          <div className="score-breakdown">
            <div className="breakdown-item">
              <FiCheck size={16} />
              <span>{completedToday} tasks done</span>
            </div>
            <div className="breakdown-item">
              <FiZap size={16} />
              <span>Mood {todayMoodScore}/10</span>
            </div>
          </div>
        </div>
        <div className="score-chart">
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={productivityMetrics.slice(-7)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 220, 0.1)" />
              <Bar dataKey="score" fill="rgba(0, 240, 220, 0.6)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted">7-day trend</p>
        </div>
      </div>

      {/* Next Best Action */}
      {nextBestAction && (
        <div className="card nba-card">
          <div className="nba-header">
            <HiOutlineFire size={20} color="var(--accent-amber)" />
            <h3>Next Best Action</h3>
          </div>
          <div className="nba-task" onClick={() => onSelectTask?.(nextBestAction.id)}>
            <div className="task-title">{nextBestAction.title}</div>
            {nextBestAction.projectId && (
              <div className="task-project">
                {projects.find(p => p.id === nextBestAction.projectId)?.name}
              </div>
            )}
            <button className="button button-primary button-sm" onClick={(e) => {
              e.stopPropagation();
              onCompleteTask?.(nextBestAction.id);
            }}>
              Complete
            </button>
          </div>
        </div>
      )}

      {/* Project Progress */}
      {activeProjects.length > 0 && (
        <div className="card projects-card">
          <h3>Active Projects</h3>
          <div className="projects-list">
            {activeProjects.slice(0, 4).map(project => (
              <div key={project.id} className="project-item">
                <div className="project-header">
                  <span className="project-name">{project.name}</span>
                  <span className="project-progress-text">{project.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="project-stats">
                  <span className="text-xs text-muted">{project.tasksCompleted}/{project.tasksTotal} tasks</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Site Analytics */}
      {topSites.length > 0 && (
        <div className="card sites-card">
          <h3>Site Usage Today</h3>
          <div className="sites-list">
            {topSites.map((site, idx) => (
              <div key={idx} className={`site-item site-${site.type}`}>
                <div className="site-domain">{site.domain}</div>
                <div className="site-duration">{Math.round(site.duration)}m</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-md">Data from ActivityWatch + Chrome extension</p>
        </div>
      )}

      {/* Weekly summary (from stats) */}
      {weeklySummary && (
        <div className="card weekly-summary-card">
          <h3>This Week</h3>
          <div className="weekly-grid">
            <div className="weekly-item">
              <div className="weekly-num">{weeklySummary.tasksTotal}</div>
              <div className="weekly-label">Tasks</div>
            </div>
            <div className="weekly-item">
              <div className="weekly-num">{weeklySummary.completed}</div>
              <div className="weekly-label">Completed</div>
            </div>
            <div className="weekly-item">
              <div className="weekly-num">{Math.round(weeklySummary.focus)}</div>
              <div className="weekly-label">Focus (min)</div>
            </div>
          </div>
        </div>
      )}

      {/* Mood Trend */}
      {moodTrend.length > 0 && (
        <div className="card mood-card">
          <h3>Mood Trend</h3>
          <div className="mood-chart">
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={moodTrend.filter(d => d.score !== null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 220, 0.1)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
                <YAxis domain={[0, 10]} stroke="var(--text-muted)" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--accent-teal)',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--accent-teal)"
                  dot={{ fill: 'var(--accent-teal)', r: 4 }}
                  strokeWidth={2}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Fitness Summary */}
      {stats && stats.workout && (
        <div className="card fitness-card">
          <h3>Fitness (This week)</h3>
          <div className="fitness-grid">
            <div className="fitness-item">
              <div className="fitness-num">{stats.workout.totalSessions}</div>
              <div className="fitness-label">Sessions</div>
            </div>
            <div className="fitness-item">
              <div className="fitness-num">{Math.round(stats.workout.totalVolume)}</div>
              <div className="fitness-label">Volume</div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      <div className="card tasks-card">
        <div className="tasks-header">
          <h3>Today's Tasks</h3>
          <button className="button button-primary button-sm" onClick={onAddTask}>
            <FiPlus size={16} /> Add Task
          </button>
        </div>
        <div className="tasks-list">
          {todaysTasks.length === 0 ? (
            <p className="text-muted text-center py-lg">No tasks yet. Start by adding one!</p>
          ) : (
            todaysTasks
              .sort((a, b) => (b.priority || 0) - (a.priority || 0))
              .map(task => (
                <div
                  key={task.id}
                  className={`task-list-item ${task.completed ? 'completed' : ''}`}
                  onClick={() => onSelectTask?.(task.id)}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => {
                      e.stopPropagation();
                      onCompleteTask?.(task.id);
                    }}
                    className="task-checkbox"
                  />
                  <div className="task-content">
                    <div className="task-name">{task.title}</div>
                    {task.projectId && (
                      <div className="task-badge">
                        {projects.find(p => p.id === task.projectId)?.name}
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="dashboard-actions">
        <button className="button button-primary" onClick={onCheckInMorning}>
          <FiCalendar size={16} /> Check In
        </button>
        <button className="button button-secondary" onClick={onAddTask}>
          <FiPlus size={16} /> New Task
        </button>
        <button className="button button-secondary" onClick={onAddWorkout}>
          <FiPlus size={16} /> Log Workout
        </button>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
