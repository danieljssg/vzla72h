import { addJob } from '../../jobs/queues/main.queue.js';

export const enqueueTask = (taskName) => {
  return async (req, _res, next) => {
    await addJob(taskName, {
      body: req.body,
      userId: req.user?.id,
      timestamp: new Date(),
    });

    next();
  };
};
