export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function selectNextBest(tasks) {
  const now = new Date();
  const annotated = tasks.map((task) => {
    const due = parseDate(task.due_date);
    const overdue = due && due < now;
    let score = 0;
    if (overdue) score += 1000;
    if (due) {
      const diffHours = (due - now) / (1000 * 60 * 60);
      score += Math.max(0, Math.floor(500 - diffHours));
    }
    score += (6 - (Number(task.priority) || 3)) * 10;
    score += task.est_minutes ? Math.max(0, 50 - Number(task.est_minutes)) : 0;
    return { ...task, due, overdue, _score: score };
  });

  annotated.sort((a, b) => b._score - a._score);
  const winner = annotated.find((task) => task.status !== 'done') || annotated[0] || null;
  if (!winner) return null;
  return {
    task_id: winner.id,
    action_text: `Work on: ${winner.title}`,
    est_minutes: Number(winner.est_minutes) || 30,
    reason: `score:${winner._score}`
  };
}

export function cleanJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;

  // Try straight parse first
  try {
    return JSON.parse(candidate);
  } catch (e) {
    // Attempt to repair common issues: trailing commas and comments
    const removeTrailingCommas = (s) => s.replace(/,\s*(?=[}\]])/g, '');
    const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^:]|^)\/\/[^\n]*$/gm, '$1');

    let attempt = candidate;
    attempt = stripComments(attempt);
    attempt = removeTrailingCommas(attempt);

    try {
      return JSON.parse(attempt);
    } catch (e2) {
      // Try extracting an array if one exists
      const arrMatch = attempt.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        const arrText = removeTrailingCommas(stripComments(arrMatch[0]));
        try {
          return JSON.parse(arrText);
        } catch (e3) {
          // fallthrough to object extraction
        }
      }

      // Try extracting an object block
      const firstObj = attempt.indexOf('{');
      const lastObj = attempt.lastIndexOf('}');
      if (firstObj >= 0 && lastObj > firstObj) {
        const objText = removeTrailingCommas(stripComments(attempt.slice(firstObj, lastObj + 1)));
        try {
          return JSON.parse(objText);
        } catch (e4) {
          // give up below
        }
      }

      // As a last resort, try to replace single quotes with double quotes (best-effort)
      const quoteFixed = attempt.replace(/(^|\W)'([^']*)'(?=\W|$)/g, '$1"$2"');
      try {
        return JSON.parse(quoteFixed);
      } catch (finalErr) {
        throw new Error('Model did not return valid JSON');
      }
    }
  }
}

export function buildDayPlan(tasks) {
  const best = selectNextBest(tasks);
  const sorted = [...tasks]
    .filter((task) => task.status !== 'done')
    .sort((a, b) => (Number(a.priority) - Number(b.priority)) || Number(a.est_minutes) - Number(b.est_minutes));
  const plan_items = sorted.map((task, index) => ({
    id: `plan-${index + 1}`,
    task_id: task.id,
    action_text: task.title,
    scheduled_time: null
  }));
  return {
    date: new Date().toISOString(),
    next_best_action_id: best ? best.task_id : null,
    plan_items
  };
}

export async function callAi(prompt, config) {
  if (!config || !config.apiUrl) {
    return { text: '' };
  }
  const provider = config.provider || 'openai';
  if (provider === 'openai') {
    const apikey = config.apiKey || config.openaiApiKey || '';
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apikey}`
      },
      body: JSON.stringify({
        model: config.model || 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: config.system || 'You are a calm productivity assistant. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: Number(config.temperature ?? 0.6),
        max_tokens: Number(config.max_tokens ?? 512)
      })
    });
    if (!response.ok) {
      throw new Error(`AI request failed (${response.status})`);
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
    return { text, raw: data };
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey || ''}`
    },
    body: JSON.stringify({ prompt, model: config.model, temperature: config.temperature, max_tokens: config.max_tokens })
  });
  if (!response.ok) {
    throw new Error(`AI request failed (${response.status})`);
  }
  const data = await response.json();
  return { text: data.text || data.output || JSON.stringify(data), raw: data };
}

export function createPlannerPrompt(tasks, dateISO) {
  return [
    'You are a calm productivity assistant.',
    'Return valid JSON only with this exact shape:',
    '{ "date": string, "next_best_action_id": string|null, "plan_items": [{ "id": string, "task_id": string|null, "action_text": string, "scheduled_time": string|null }] }',
    'Rules:',
    '- Choose the Next Best Action first.',
    '- Sort by priority, deadline, and realistic effort.',
    '- Keep the plan calm and specific.',
    '- Split large work into smaller steps.',
    '',
    `Date: ${dateISO}`,
    `Tasks: ${JSON.stringify(tasks, null, 2)}`
  ].join('\n');
}

export function groupTasksByProject(tasks, projects) {
  const map = new Map();
  projects.forEach((project) => map.set(project.id, []));
  tasks.forEach((task) => {
    const key = task.project_id || 'unassigned';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(task);
  });
  return map;
}

export function normalizeGoalText(text) {
  return String(text || '').trim().replace(/\s+/g, ' ');
}

export function createProjectExpansionPrompt(project, tasks, projects) {
  return [
    'You are a calm productivity assistant helping break one long-term project into actionable todos.',
    'Return valid JSON only with this exact shape:',
    '{ "project_id": string, "project_goal": string, "add": [{ "title": string, "priority": number, "est_minutes": number, "notes": string }], "update": [{ "task_id": string, "title"?: string, "priority"?: number, "est_minutes"?: number, "notes"?: string }], "remove": [{ "task_id": string, "reason": string }] }',
    'Rules:',
    '- Use the project goal and the current todo list context.',
    '- Add only realistic todos for the next few steps.',
    '- Prefer short, specific, calm tasks.',
    '- Do not invent unsupported fields.',
    '',
    `Project: ${JSON.stringify(project, null, 2)}`,
    `Projects: ${JSON.stringify(projects, null, 2)}`,
    `Current todos: ${JSON.stringify(tasks, null, 2)}`
  ].join('\n');
}

export function fallbackProjectExpansion(project, tasks) {
  const goal = normalizeGoalText(project.goal || project.description || project.name || 'Project');
  const existing = tasks.filter((task) => task.project_id === project.id);
  const baseTitle = goal.split(/[.;:]/)[0].slice(0, 40) || project.name;
  const add = [
    { title: `Clarify scope for ${baseTitle}`, priority: 2, est_minutes: 20, notes: `Break down the goal: ${goal}` },
    { title: `Collect inputs for ${baseTitle}`, priority: 2, est_minutes: 30, notes: 'Capture links, notes, and constraints.' },
    { title: `Draft next action for ${baseTitle}`, priority: 1, est_minutes: 25, notes: 'Turn the project into a next step.' }
  ].filter((item) => !existing.some((task) => task.title.toLowerCase() === item.title.toLowerCase()));

  return {
    project_id: project.id,
    project_goal: goal,
    add
  };
}

export function applyProjectExpansion(projectId, tasks, expansion) {
  const addOps = Array.isArray(expansion?.add) ? expansion.add : [];
  const updateOps = Array.isArray(expansion?.update) ? expansion.update : [];
  const removeOps = Array.isArray(expansion?.remove) ? expansion.remove : [];
  const byId = new Map(tasks.map((task) => [task.id, { ...task }]));

  updateOps.forEach((op) => {
    if (!op || !op.task_id || !byId.has(op.task_id)) return;
    const current = byId.get(op.task_id);
    byId.set(op.task_id, {
      ...current,
      ...(op.title ? { title: op.title } : {}),
      ...(op.priority != null ? { priority: Number(op.priority) } : {}),
      ...(op.est_minutes != null ? { est_minutes: Number(op.est_minutes) } : {}),
      ...(op.notes != null ? { notes: op.notes } : {})
    });
  });

  removeOps.forEach((op) => {
    if (op?.task_id) byId.delete(op.task_id);
  });

  const generated = addOps.map((item) => ({
    id: `task-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
    title: item.title,
    project_id: projectId,
    priority: Number(item.priority) || 2,
    est_minutes: Number(item.est_minutes) || 30,
    due_date: '',
    status: 'todo',
    notes: item.notes || ''
  }));

  return [...generated, ...Array.from(byId.values())];
}

export function summarizeAwSites(entries) {
  const rows = Array.isArray(entries) ? entries : [];
  const normalized = rows.map((entry) => {
    const url = String(entry.url || entry.domain || entry.title || '').trim();
    const duration = Number(entry.duration_minutes || entry.duration || 0);
    const domain = url ? (url.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '') || 'unknown') : 'unknown';
    return { ...entry, domain, duration: Number.isNaN(duration) ? 0 : duration };
  });
  const totals = new Map();
  normalized.forEach((entry) => {
    totals.set(entry.domain, (totals.get(entry.domain) || 0) + entry.duration);
  });
  return Array.from(totals.entries())
    .map(([domain, minutes]) => ({ domain, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}
