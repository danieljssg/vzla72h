import { Router } from 'express';
import { getJobStatus, getMyJobs } from './jobs.controller.js';

const router = Router();

router.get('/', getMyJobs);
router.get('/:jobId/status', getJobStatus);

export default router;
