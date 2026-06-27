import { Queue } from 'bullmq';
import { createBullMQConnection } from '../../config/redis.js';

export const mainQueue = new Queue('mainStream', {
  connection: createBullMQConnection('queue:mainStream'),
});

export const addJob = (name, data) => {
  return mainQueue.add(name, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};
