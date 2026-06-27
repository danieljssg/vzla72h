import logger from '../../config/logger.js';
import Job from '../../shared/models/Job.js';

export const setJobProgress = async (jobId, percentage, step) => {
  try {
    return await Job.findByIdAndUpdate(
      jobId,
      {
        progress: {
          percentage,
          step,
        },
      },
      { returnDocument: 'after' },
    );
  } catch (error) {
    logger.error(`Error updating job progress: ${error.message}`);
    return null;
  }
};
