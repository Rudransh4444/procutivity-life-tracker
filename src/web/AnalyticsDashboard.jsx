import React, { useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiCheck, FiCalendar, FiPlus, FiZap, FiFeather } from 'react-icons/fi';
import { HiOutlineFire } from 'react-icons/hi';
import { callAi, cleanJson, createTaskBreakdownPrompt, fallbackTaskBreakdown, normalizeTaskBreakdownPayload } from './logic.js';

/**
 * Analytics Dashboard - General tab
 * Displays tasks, productivity, usage, and task breakdown actions.
 */
export function AnalyticsDashboard({
  tasks = [],
  projects = [],
  moodTrend = [],
  productivityMetrics = [],
  awData = [],
  todayMood = null,
  aiConfig = {},
  onAddTask,
  onAddWorkout,
  onCheckInMorning,
  onCompleteTask,
  onSelectTask
}) {
  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((task) => task.date === today);
  const completedToday = todaysTasks.filter((task) => task.completed).length;
  const todayMoodScore = todayMood?.score || 5;
  const [generatingTaskId, setGeneratingTaskId] = useState(null);
  const [taskBreakdowns, setTaskBreakdowns] = useState({});

  const todaysScore = useMemo(() => {
    let score = 0;
    score += Math.min(completedToday * 10, 50);
    score += Math.min(Math.floor(30), 20);
    score += todayMoodScore >= 7 ? 15 : todayMoodScore >= 4 ? 10 : 5;
    return Math.min(Math.floor(score), 100);
  }, [completedToday, todayMoodScore]);

  const nextBestAction = useMemo(() => {
    const uncompletedToday = todaysTasks
      .filter((task) => !task.completed)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return uncompletedToday[0] || null;
  }, [todaysTasks]);

  const activeProjects = useMemo(() => {
    return projects
      .filter((project) => !project.completed)
      .map((project) => {
        const projectTasks = tasks.filter((task) => task.projectId === project.id);
        const completed = projectTasks.filter((task) => task.completed).length;
        const total = projectTasks.length || 1;
        return {
          ...project,
          progress: Math.floor((completed / total) * 100),
          tasksCompleted: completed,
          tasksTotal: total
        };
      })
      .sort((a, b) => b.progress - a.progress);
  }, [tasks, projects]);

  const topSites = useMemo(() => {
    if (!awData || awData.length === 0) return [];

    const sorted = [...awData]
      .sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0))
      .slice(0, 5);
    const maxDuration = sorted[0]?.duration_minutes || 1;

    return sorted.map((site) => {
      const domain = new URL(`https://${site.url}`).hostname.replace(/^www\./, '');
      const isProductive = ['github.com', 'docs.google.com', 'figma.com', 'stackoverflow.com'].some((entry) =>
        domain.includes(entry)
      );
      const isDistraction = ['youtube.com', 'x.com', 'reddit.com', 'instagram.com'].some((entry) =>
        domain.includes(entry)
      );

      return {
        domain,
        duration: site.duration_minutes || 0,
        fill: Math.max(8, Math.round(((site.duration_minutes || 0) / maxDuration) * 100)),
        type: isProductive ? 'productive' : isDistraction ? 'distraction' : 'neutral'
      };
    });
  }, [awData]);

  const handleGenerateBreakdown = async (task) => {
    const projectName = projects.find((project) => project.id === task.projectId)?.name || '';
    const prompt = createTaskBreakdownPrompt(task, task.priority, projectName);
    const fallback = fallbackTaskBreakdown(task, task.priority);

    setGeneratingTaskId(task.id);
    setTaskBreakdowns((current) => ({
      ...current,
      [task.id]: { loading: true, items: current[task.id]?.items || [], error: '' }
    }));

    try {
      if (!aiConfig?.apiUrl || !aiConfig?.apiKey) {
        const items = fallback;
        setTaskBreakdowns((current) => ({
          ...current,
          [task.id]: { loading: false, items, error: '' }
        }));
        return;
      }

      const response = await callAi(prompt, {
        ...aiConfig,
        system: 'Return only JSON. Break tasks into clear subtasks.'
      });
      const parsed = cleanJson(response.text);
      const items = normalizeTaskBreakdownPayload(parsed, task);

      setTaskBreakdowns((current) => ({
        ...current,
        [task.id]: { loading: false, items, error: '' }
      }));
    } catch (error) {
      setTaskBreakdowns((current) => ({
        ...current,
        [task.id]: { loading: false, items: fallback, error: error.message || 'Unable to generate subtasks.' }
      }));
    } finally {
      setGeneratingTaskId(null);
    }
  };

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <div className="greeting">
          <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</h1>
          <p className="text-secondary">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="card productivity-score-card">
        <div className="score-main">
          <div className="score-number">
            <div className="score-circle score-circle--pulse">{todaysScore}</div>
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
            <div className="breakdown-item">
              <FiCalendar size={16} />
              <span>{todaysTasks.length} tasks today</span>
            </div>
          </div>
        </div>
      </div>

      {nextBestAction && (
        <div className="card nba-card">
          <div className="nba-header">
            <HiOutlineFire size={20} color="var(--accent-warm)" />
            <h3>Next Best Action</h3>
          </div>
          <div className="nba-task" onClick={() => onSelectTask?.(nextBestAction.id)}>
            <div className="task-title">{nextBestAction.title}</div>
            {nextBestAction.projectId && (
              <div className="task-project">{projects.find((project) => project.id === nextBestAction.projectId)?.name}</div>
            )}
            <button
              className="button button-primary button-sm"
              onClick={(event) => {
                event.stopPropagation();
                onCompleteTask?.(nextBestAction.id);
              }}
            >
              Complete
            </button>
          </div>
        </div>
      )}

      <div className="card tasks-card">
        <div className="tasks-header">
          <h3>Today's Tasks</h3>
          <button className="button button-primary button-sm" onClick={onAddTask}>
            <FiPlus size={16} /> Add Task
          </button>
        </div>

        <div className="tasks-list">
          {todaysTasks.length === 0 ? (
            <p className="text-muted text-center py-lg">No tasks yet. Start by adding one.</p>
          ) : (
            todaysTasks
              .sort((a, b) => (b.priority || 0) - (a.priority || 0))
              .map((task) => {
                const breakdown = taskBreakdowns[task.id];
                const isGenerating = generatingTaskId === task.id || breakdown?.loading;

                return (
                  <div key={task.id} className={`task-card-wrap ${task.completed ? 'completed' : ''}`}>
                    <div className={`task-list-item ${task.completed ? 'completed' : ''}`} onClick={() => onSelectTask?.(task.id)}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(event) => {
                          event.stopPropagation();
                          onCompleteTask?.(task.id);
                        }}
                        className="task-checkbox"
                      />
                      <div className="task-content">
                        <div className="task-name">{task.title}</div>
                        {task.projectId && (
                          <div className="task-badge">{projects.find((project) => project.id === task.projectId)?.name}</div>
                        )}
                      </div>
                      <div className="task-actions-inline">
                        <button
                          className={`task-wand-button ${isGenerating ? 'task-wand-button--loading' : ''}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleGenerateBreakdown(task);
                          }}
                          title="Break into subtasks"
                        >
                          <FiFeather size={16} />
                        </button>
                      </div>
                    </div>

                    {breakdown?.loading && (
                      <div className="task-breakdown task-breakdown--loading">
                        <div className="task-breakdown__loader">
                          <span />
                          <span />
                          <span />
                        </div>
                        <p>AI is shaping a smaller plan...</p>
                      </div>
                    )}

                    {!breakdown?.loading && breakdown?.items?.length > 0 && (
                      <div className="task-breakdown">
                        {breakdown.error && <div className="task-breakdown__error">{breakdown.error}</div>}
                        <div className="task-breakdown__header">
                          <span>Subtasks</span>
                          <span>{breakdown.items.length}</span>
                        </div>
                        <div className="task-breakdown__list">
                          {breakdown.items.map((item, index) => (
                            <div key={`${task.id}-${index}`} className="task-breakdown__item">
                              <div className="task-breakdown__title">
                                <span className="task-breakdown__index">{index + 1}</span>
                                {item.title}
                              </div>
                              <div className="task-breakdown__meta">
                                <span>{item.estimatedMinutes} min</span>
                                <span>Priority {item.priority}</span>
                              </div>
                              {item.notes && <p className="task-breakdown__notes">{item.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {activeProjects.length > 0 && (
        <div className="card projects-card">
          <h3>Active Projects</h3>
          <div className="projects-list">
            {activeProjects.slice(0, 4).map((project) => (
              <div key={project.id} className="project-item">
                <div className="project-header">
                  <span className="project-name">{project.name}</span>
                  <span className="project-progress-text">{project.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="project-stats">
                  <span className="text-xs text-muted">
                    {project.tasksCompleted}/{project.tasksTotal} tasks
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topSites.length > 0 && (
        <div className="card sites-card">
          <h3>Top 5 Apps Today</h3>
          <div className="sites-list">
            {topSites.map((site) => (
              <div key={site.domain} className={`site-item site-${site.type}`}>
                <div className="site-domain">{site.domain}</div>
                <div className="site-progress-row">
                  <div className="progress-bar site-progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${site.fill}%` }} />
                  </div>
                  <div className="site-duration">{Math.round(site.duration)}m</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-md">Data from ActivityWatch + local browser tracking</p>
        </div>
      )}

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
