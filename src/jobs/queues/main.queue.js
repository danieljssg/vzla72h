import { Queue } from 'bullmq';
import { createBullMQConnection } from '../../config/redis.js';

// Each Queue gets its own dedicated Redis connection
export const mainQueue = new Queue('mainStream', {
  connection: createBullMQConnection('queue:mainStream'),
});

export const analysisQueue = new Queue('analysisStream', {
  connection: createBullMQConnection('queue:analysisStream'),
});

export const addAudioQueue = new Queue('audioStream', {
  connection: createBullMQConnection('queue:audioStream'),
});

export const addJob = (name, data) => {
  return mainQueue.add(name, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

export const addJobAnalysis = (name, data) => {
  return analysisQueue.add(name, data, {
    attempts: 10,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

export const addJobAudio = (name, data) => {
  return addAudioQueue.add(name, data, {
    jobId: data.analysisId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};
