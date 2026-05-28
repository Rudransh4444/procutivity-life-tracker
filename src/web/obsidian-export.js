// obsidian-export.js — simple markdown export helpers for journals and daily summaries
import { loadJSON } from './storage.js';

export async function exportDailyJournal(dateStr) {
  // dateStr format YYYY-MM-DD
  const journals = await loadJSON('journals', []);
  const moods = await loadJSON('moods', []);
  const dayJ = journals.filter(j => j.date && j.date.startsWith(dateStr));
  const dayM = moods.filter(m => m.date && m.date === dateStr);

  const frontmatter = `---\ncreated: ${dateStr}\n---\n`;
  let body = `# Journal - ${dateStr}\n\n`;
  for (const j of dayJ) {
    body += `## Journal entry\n${j.content || ''}\n\n`;
  }
  body += `## Mood\n`;
  for (const m of dayM) {
    body += `- score: ${m.score} - notes: ${m.notes || ''}\n`;
  }

  const md = frontmatter + body;
  download(`${dateStr}-journal.md`, md);
  return md;
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default { exportDailyJournal };
