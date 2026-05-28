const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: false });

const dayPlanSchema = {
  type: 'object',
  properties: {
    date: { type: 'string' },
    next_best_action_id: { type: ['string', 'null'] },
    plan_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          task_id: { type: ['string', 'null'] },
          action_text: { type: 'string' },
          scheduled_time: { type: ['string', 'null'] }
        },
        required: ['id','action_text']
      }
    }
  },
  required: ['date','plan_items']
};

const validateDayPlan = ajv.compile(dayPlanSchema);
module.exports = { validateDayPlan };
