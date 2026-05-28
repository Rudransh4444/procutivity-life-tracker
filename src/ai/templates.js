const dayPlannerPrompt = (context) => `You are a calm productivity assistant. Given the user's tasks and context, produce a realistic day plan.

Context:
${JSON.stringify(context, null, 2)}

Rules:
- Choose a single Next Best Action first.
- Sort tasks by urgency, priority, and estimated time.
- Keep plans realistic and split tasks longer than 90 minutes into chunks.
- Return JSON with shape: { date, next_best_action_id, plan_items: [{id, task_id, action_text, scheduled_time}] }
`;

const breakdownPrompt = (task) => `You are a calm productivity assistant. Please break the task into small actionable steps.

Task:
${JSON.stringify(task, null, 2)}

Return JSON array of steps, each with: { id, text, est_minutes }`;

module.exports = { dayPlannerPrompt, breakdownPrompt };
