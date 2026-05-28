export const sampleProjects = [
  { id: 'proj-personal', name: 'Personal', color: '#5eead4', description: 'Daily life and admin', goal: 'Keep life admin light and under control.' },
  { id: 'proj-work', name: 'Work', color: '#60a5fa', description: 'Productivity and delivery', goal: 'Ship the current work items with low pressure.' }
];

export const sampleTasks = [
  { id: 'task-readme', title: 'Write project README', project_id: 'proj-work', priority: 2, est_minutes: 45, due_date: '', status: 'todo', notes: '' },
  { id: 'task-crud', title: 'Implement task CRUD API', project_id: 'proj-work', priority: 1, est_minutes: 120, due_date: '', status: 'todo', notes: '' },
  { id: 'task-plan', title: 'Prepare sprint plan', project_id: 'proj-work', priority: 3, est_minutes: 30, due_date: '', status: 'todo', notes: '' },
  { id: 'task-triage', title: 'Quick bug triage', project_id: 'proj-work', priority: 2, est_minutes: 20, due_date: '', status: 'todo', notes: '' },
  { id: 'task-admin', title: 'Pay bills', project_id: 'proj-personal', priority: 2, est_minutes: 15, due_date: '', status: 'todo', notes: '' }
];

export const sampleBlockedDomains = ['youtube.com', 'x.com'];
