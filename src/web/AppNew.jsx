import React, { useState, useEffect, useMemo } from 'react';
import '../web/theme.css';
import '../web/dashboard.css';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import MorningRoutineModal from './MorningRoutineModal.jsx';
import EveningRoutineModal from './EveningRoutineModal.jsx';
import SettingsModal from './SettingsModal.jsx';
import {
  LS,
  loadJSON,
  saveJSON,
  ensureSeed,
  uid,
  addMoodEvent,
  getMoodTrend,
  calculateProductivityScore,
  saveProductivityMetric,
  getProductivityMetrics,
  shouldShowMorningRoutine,
  markMorningRoutineComplete,
  shouldShowEveningRoutine,
  markEveningRoutineComplete
} from './dataModel.js';
import { FiSettings } from 'react-icons/fi';

const defaultAiConfig = {
  apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
  apiKey: '',
  provider: 'openai',
  model: 'llama-3.1-8b-instant',
  temperature: 0.4,
  max_tokens: 400,
  awHost: 'http://localhost:5600'
};

const defaultAwData = [];

function usePersistedState(key, fallback) {
  const [value, setValue] = useState(() => ensureSeed(key, fallback));
  React.useEffect(() => saveJSON(key, value), [key, value]);
  return [value, setValue];
}

function getTimeOfDay(hour = new Date().getHours()) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 20) return 'evening';
  return 'night';
}

function pickGreetingMessage({ timeOfDay, hour, moodScore, taskCount, projectCount }) {
  const isLowMood = Number(moodScore || 0) > 0 && Number(moodScore || 0) <= 4;
  const hasTasks = Number(taskCount || 0) > 0;
  const hasProjects = Number(projectCount || 0) > 0;

  const messages = [
    { id: 'm1', when: 'morning', text: 'Morning. Let’s get things done.', priority: 5 },
    { id: 'm2', when: 'morning', text: 'Good morning. One clear step first.', priority: 4 },
    { id: 'm3', when: 'morning', text: 'Morning — we can keep this simple.', priority: 3 },
    { id: 'm4', when: 'morning', text: 'Let’s start clean and steady.', priority: 3 },
    { id: 'm5', when: 'morning', text: 'Good morning. Ready when you are.', priority: 4 },
    { id: 'm6', when: 'morning', text: 'A fresh start. Keep it light.', priority: 2, condition: () => !hasTasks },
    { id: 'm7', when: 'morning', text: 'Morning. We’ll take this one step at a time.', priority: 3 },
    { id: 'm8', when: 'morning', text: 'Good morning. Let’s make the first move.', priority: 4 },
    { id: 'm9', when: 'morning', text: 'You’ve got this. Start small.', priority: 3 },
    { id: 'm10', when: 'morning', text: 'Morning. If today feels heavy, we’ll keep it light.', priority: 5, condition: () => isLowMood },

    { id: 'a1', when: 'evening', text: 'Good afternoon, let’s keep it moving.', priority: 5 },
    { id: 'a2', when: 'evening', text: 'Hey — still time to get something useful done.', priority: 4 },
    { id: 'a3', when: 'evening', text: 'Afternoon check-in. What’s next?', priority: 3 },
    { id: 'a4', when: 'evening', text: 'Let’s land one solid win.', priority: 5 },
    { id: 'a5', when: 'evening', text: 'Good afternoon. Keep the pace calm.', priority: 3 },
    { id: 'a6', when: 'evening', text: 'We’re in the middle of it. Keep going.', priority: 2 },
    { id: 'a7', when: 'evening', text: 'Good afternoon. One more useful step.', priority: 4 },
    { id: 'a8', when: 'evening', text: 'Let’s finish the next thing, not everything.', priority: 4, condition: () => hasTasks },
    { id: 'a9', when: 'evening', text: 'A steady afternoon still counts.', priority: 2 },
    { id: 'a10', when: 'evening', text: 'Good afternoon. Small progress is still progress.', priority: 4, condition: () => hasProjects },

    { id: 'n1', when: 'night', text: 'Good evening. Let’s wind down or finish clean.', priority: 5 },
    { id: 'n2', when: 'night', text: 'Night mode. Stay calm, keep it sharp.', priority: 3 },
    { id: 'n3', when: 'night', text: 'One last pass, then you’re good.', priority: 4 },
    { id: 'n4', when: 'night', text: 'Good evening. No rush now.', priority: 3 },
    { id: 'n5', when: 'night', text: 'Night time. Clear head, easy pace.', priority: 2 },
    { id: 'n6', when: 'night', text: 'Let’s close the day neatly.', priority: 4 },
    { id: 'n7', when: 'night', text: 'Good evening. You’re doing fine.', priority: 3 },
    { id: 'n8', when: 'night', text: 'Night focus. Just one useful move.', priority: 4, condition: () => hasTasks },
    { id: 'n9', when: 'night', text: 'If tonight feels slow, that’s okay.', priority: 5, condition: () => isLowMood },
    { id: 'n10', when: 'night', text: 'Late hour, simple work, steady finish.', priority: 2 }
  ];

  const pool = messages.filter((message) => message.when === timeOfDay && (!message.condition || message.condition()));
  const ranked = pool.length ? pool : messages.filter((message) => message.when === timeOfDay);
  const sorted = ranked.sort((a, b) => b.priority - a.priority);
  const indexSeed = Math.abs(((hour || 0) * 13) + (Number(moodScore || 0) * 7) + taskCount + projectCount);
  return sorted[indexSeed % sorted.length] || sorted[0] || messages[0];
}

const backgroundImages = {
  morning: '/morning.png',
  evening: '/evening-dawn.png',
  night: '/night.png'
};

const vibeLabels = {
  morning: 'Morning glow',
  evening: 'Evening calm',
  night: 'Night focus'
};

export function App() {
  const [tasks, setTasks] = usePersistedState(LS.tasks, []);
  const [projects, setProjects] = usePersistedState(LS.projects, []);
  const [aiConfig, setAiConfig] = usePersistedState(LS.aiConfig, defaultAiConfig);
  const [awData, setAwData] = usePersistedState(LS.awConfig, defaultAwData);

  const [showMorningRoutine, setShowMorningRoutine] = useState(false);
  const [showEveningRoutine, setShowEveningRoutine] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [moodTrend, setMoodTrend] = useState([]);
  const [productivityMetrics, setProductivityMetrics] = useState([]);
  const [todayMood, setTodayMood] = useState(null);
  const [timeOfDay, setTimeOfDay] = useState(() => getTimeOfDay());
  const [showChrome, setShowChrome] = useState(false);
  const [showWidgets, setShowWidgets] = useState(false);
  const [statsState, setStatsState] = useState({ daily: null, weekly: null, monthly: null, trend: [] });

  useEffect(() => {
    const syncTimeOfDay = () => setTimeOfDay(getTimeOfDay());
    syncTimeOfDay();
    const timer = window.setInterval(syncTimeOfDay, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setShowChrome(false);
    setShowWidgets(false);
    const chromeTimer = window.setTimeout(() => setShowChrome(true), 1100);
    const widgetTimer = window.setTimeout(() => setShowWidgets(true), 1650);
    return () => {
      window.clearTimeout(chromeTimer);
      window.clearTimeout(widgetTimer);
    };
  }, [timeOfDay]);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 8 && hour < 12 && shouldShowMorningRoutine()) {
      setShowMorningRoutine(true);
    } else if (hour >= 21 && shouldShowEveningRoutine()) {
      setShowEveningRoutine(true);
    }

    setMoodTrend(getMoodTrend(7));
    setProductivityMetrics(getProductivityMetrics(7));

    const today = new Date().toISOString().split('T')[0];
    const moodEvents = loadJSON(LS.moodEvents, []);
    const todayMoodEvent = moodEvents
      .filter((e) => e.date === today)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    setTodayMood(todayMoodEvent || null);

    if (!aiConfig.apiKey && !aiConfig.openaiApiKey) {
      setShowSettings(true);
    }

    // Generate recurring tasks for today and schedule reminders
    (async () => {
      try {
        const { default: recurrence } = await import('./recurrence.js');
        const { default: reminders } = await import('./reminders.js');
        const { default: stats } = await import('./stats.js');

        const created = await recurrence.generateForDate(new Date());
        if (created && created.length > 0) {
          // reload tasks from storage and update state
          const currentTasks = loadJSON(LS.tasks, []);
          setTasks(currentTasks);
        }
        // schedule any saved reminders
        await reminders.scheduleAll();

        // load stats
        try {
          const weekly = await stats.getWeeklyStats(new Date());
          const monthly = await stats.getMonthlyStats(new Date());
          const trend = await stats.getTrend('productivity', 14);
          const daily = await stats.getDailyStats(new Date());
          setStatsState({ daily, weekly, monthly, trend });
        } catch (es) {
          console.warn('stats load error', es);
        }
      } catch (e) {
        console.warn('recurrence/reminders init error', e);
      }
    })();
  }, []);

  const backgroundImage = backgroundImages[timeOfDay];
  const sceneLabel = vibeLabels[timeOfDay];

  const handleAddTask = (title, projectId = null, priority = 5) => {
    const today = new Date().toISOString().split('T')[0];
    const newTask = {
      id: uid('task'),
      title,
      date: today,
      completed: false,
      priority,
      projectId,
      createdAt: new Date().toISOString(),
      estimatedMinutes: 30
    };
    setTasks([...tasks, newTask]);
    return newTask;
  };

  const handleAddTasks = (newTasks) => {
    setTasks([...tasks, ...newTasks]);
  };

  const handleCompleteTask = (taskId) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    setTasks(updated);

    const today = new Date().toISOString().split('T')[0];
    const todaysTasks = updated.filter((t) => t.date === today);
    const completed = todaysTasks.filter((t) => t.completed).length;
    const score = calculateProductivityScore({
      tasksCompletedToday: completed,
      moodScore: todayMood?.score || 5
    });
    saveProductivityMetric(today, score);
    setProductivityMetrics(getProductivityMetrics(7));
  };

  const handleAddProject = (name, goal) => {
    const newProject = {
      id: uid('project'),
      name,
      goal,
      completed: false,
      createdAt: new Date().toISOString()
    };
    setProjects([...projects, newProject]);
    return newProject;
  };

  const handleAddNewTasks = (newTasks) => {
    handleAddTasks(newTasks);
  };

  const handleSaveConfig = (newConfig) => {
    setAiConfig(newConfig);
    setShowSettings(false);
  };

  const handleEveningReview = (data) => {
    addMoodEvent(data.mood, `Accomplished: ${data.accomplished}\n${data.notes}`);
    setTodayMood({ score: data.mood, date: new Date().toISOString().split('T')[0] });
    setMoodTrend(getMoodTrend(7));
    markEveningRoutineComplete();
  };

  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter((t) => t.date === today);
  const greeting = pickGreetingMessage({
    timeOfDay,
    hour: new Date().getHours(),
    moodScore: todayMood?.score || 0,
    taskCount: todaysTasks.length,
    projectCount: projects.length
  });

  const shellStyle = useMemo(() => ({ '--scene-image': `url(${backgroundImage})` }), [backgroundImage]);

  return (
    <div className={`app-shell app-shell-${timeOfDay} ${showChrome ? 'app-shell--ready' : 'app-shell--cold'}`} style={shellStyle} data-time-of-day={timeOfDay}>
      <div className="app-shell__overlay" />
      <div className="app-shell__glow app-shell__glow--left" />
      <div className="app-shell__glow app-shell__glow--right" />

      <div className={`intro-hero ${showChrome ? 'intro-hero--ready' : 'intro-hero--hidden'} ${showWidgets ? 'intro-hero--compact' : ''}`}>
        <div className="intro-hero__copy">
          <div className="intro-hero__eyebrow">{sceneLabel}</div>
          <h1 className="intro-hero__title">{greeting.text}</h1>
          <p className="intro-hero__subtitle">
            Let’s get things done.
          </p>
        </div>
      </div>

      {showMorningRoutine && (
        <MorningRoutineModal
          projects={projects}
          currentTasks={todaysTasks}
          aiConfig={aiConfig}
          onAddNewTasks={handleAddNewTasks}
          onComplete={() => {
            markMorningRoutineComplete();
            setShowMorningRoutine(false);
          }}
        />
      )}

      {showEveningRoutine && (
        <EveningRoutineModal
          previousMood={todayMood?.score}
          onSaveMood={handleEveningReview}
          onComplete={() => setShowEveningRoutine(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          aiConfig={aiConfig}
          onSaveConfig={handleSaveConfig}
        />
      )}

      <div className="shell-toolbar">
        <div className="scene-chip">{sceneLabel}</div>
        <button className="button button-secondary button-sm" onClick={() => setShowSettings(true)} title="Settings">
          <FiSettings size={18} />
        </button>
      </div>

      <div className={`widgets-stage ${showWidgets ? 'widgets-stage--visible' : ''}`}>
        <AnalyticsDashboard
          tasks={tasks}
          projects={projects}
          moodTrend={moodTrend}
          productivityMetrics={productivityMetrics}
          awData={awData}
          todayMood={todayMood}
          sceneLabel={sceneLabel}
          stats={statsState}
          onAddTask={() => {
            const title = prompt('Task title:');
            if (title) handleAddTask(title);
          }}
          onCheckInMorning={() => setShowMorningRoutine(true)}
          onCompleteTask={handleCompleteTask}
          onSelectTask={() => {}}
        />

        <div className="debug-panel">
          <details>
            <summary>Debug Info</summary>
            <pre>
              Tasks: {tasks.length}
              {'\n'}Projects: {projects.length}
              {'\n'}Today's tasks: {todaysTasks.length}
              {'\n'}Mood: {todayMood?.score}/10
              {'\n'}API Key: {aiConfig.apiKey ? '***SET***' : 'NOT SET'}
              {'\n'}Current hour: {new Date().getHours()}
              {'\n'}Morning routine show: {shouldShowMorningRoutine()}
              {'\n'}Evening routine show: {shouldShowEveningRoutine()}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

export default App;
