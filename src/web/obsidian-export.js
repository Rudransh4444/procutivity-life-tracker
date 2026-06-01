// obsidian-export.js — GitHub-backed markdown sync helpers for journals and daily summaries
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
    '- Synced through GitHub into your Obsidian vault. No browser download is shown.'
  ];

  return lines.join('\n');
}

function normalizePathSegment(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function getJournalPath(dateStr, config = {}) {
  const prefix = normalizePathSegment(config.githubPathPrefix || 'Obsidian/Daily');
  return `${prefix ? `${prefix}/` : ''}${dateStr}-journal.md`;
}

function encodeGitHubPath(path) {
  return String(path)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function getGitHubConfig(config = {}) {
  const owner = normalizePathSegment(config.githubOwner);
  const repo = normalizePathSegment(config.githubRepo);
  const branch = normalizePathSegment(config.githubBranch) || 'main';
  const token = String(config.githubToken || '').trim();
  const path = getJournalPath(new Date().toISOString().split('T')[0], config);

  return { owner, repo, branch, token, path };
}

async function getExistingSha({ owner, repo, path, branch, token }) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub lookup failed (${response.status})`);
  }

  const data = await response.json();
  return data?.sha || null;
}

export function buildDailyJournalMarkdown(dateStr) {
  return buildMarkdown(dateStr);
}

export async function syncDailyJournalToGitHub(dateStr, config = loadJSON(LS.aiConfig, {})) {
  const { owner, repo, branch, token, path } = getGitHubConfig(config);
  if (!owner || !repo || !token) {
    throw new Error('Configure GitHub owner, repo, and token first.');
  }

  const markdown = buildMarkdown(dateStr);
  const sha = await getExistingSha({ owner, repo, path, branch, token });

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeGitHubPath(path)}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      message: `Sync daily journal for ${dateStr}`,
      content: encodeBase64(markdown),
      branch,
      ...(sha ? { sha } : {})
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub sync failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  return {
    path,
    branch,
    markdown,
    url: data?.content?.html_url || data?.commit?.html_url || null,
    commitSha: data?.commit?.sha || null
  };
}

export async function quartzSyncToGitHub(config = loadJSON(LS.aiConfig, {})) {
  const owner = normalizePathSegment(config.githubOwner);
  const repo = normalizePathSegment(config.githubRepo);
  const branch = normalizePathSegment(config.githubBranch) || 'main';
  const token = String(config.githubToken || '').trim();
  const pathPrefix = normalizePathSegment(config.githubQuartzPathPrefix || 'quartz_vault');

  if (!owner || !repo || !token) throw new Error('Configure GitHub owner/repo/token in Settings');

  const resp = await fetch('/api/quartz_sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, repo, branch, token, pathPrefix })
  });

  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Quartz sync failed: ${detail}`);
  }

  return resp.json();
}

export default { buildDailyJournalMarkdown, syncDailyJournalToGitHub };
