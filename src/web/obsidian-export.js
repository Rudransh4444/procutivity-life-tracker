// obsidian-export.js — local-only markdown export helpers for journals and daily summaries
import { loadJSON, LS } from './dataModel.js';

function getTasksForDate(dateStr) {
  return loadJSON(LS.tasks, []).filter((task) => task.date === dateStr);
}

function getMoodForDate(dateStr) {
  return loadJSON(LS.moodEvents, []).filter((event) => event.date === dateStr);
}

function getProductivityForDate(dateStr) {
  const metrics = loadJSON(LS.productivityMetrics, []);
  return metrics.find((metric) => metric.date === dateStr) || null;
}

function buildMarkdown(dateStr) {
  const tasks = getTasksForDate(dateStr);
  const moods = getMoodForDate(dateStr);
  const productivity = getProductivityForDate(dateStr);
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;

  const completedTasks = tasks.filter((task) => task.completed);
  const pendingTasks = tasks.filter((task) => !task.completed);

  const lines = [
    '---',
    `date: ${dateStr}`,
    'source: local-ai-productivity',
    'privacy: local-only',
    'tags:',
    '  - productivity',
    '  - daily-journal',
    '---',
    '',
    `# Daily Journal - ${dateStr}`,
    '',
    `## Snapshot`,
    `- Tasks completed: ${completed}/${total}`,
    `- Productivity score: ${productivity?.score ?? 'n/a'}`,
    `- Mood entries: ${moods.length}`,
    '',
    '## Completed Tasks',
    ...(completedTasks.length ? completedTasks.map((task) => `- [x] ${task.title}`) : ['- None']),
    '',
    '## Pending Tasks',
    ...(pendingTasks.length ? pendingTasks.map((task) => `- [ ] ${task.title}`) : ['- None']),
    '',
    '## Mood',
    ...(moods.length
      ? moods.map((mood) => `- ${mood.score}/10${mood.notes ? ` - ${mood.notes}` : ''}`)
      : ['- No mood entries recorded']),
    '',
    '## Notes',
    '- Export created locally by the app. No cloud sync is involved.'
  ];

  return lines.join('\n');
}

export async function exportDailyJournal(dateStr) {
  const md = buildMarkdown(dateStr);
  download(`${dateStr}-journal.md`, md);
  return md;
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default { exportDailyJournal };
