import { Router } from 'express';
import multer from 'multer';
import { cacheMiddleware } from '../../api/middlewares/cache.js';
import {
  createEmergencyNeedSchema,
  updateEmergencyNeedSchema,
} from '../../utils/validations/schemas/emergencyNeedSchema.js';
import zodValidate from '../../utils/validations/zodValidator.js';
import {
  createEmergencyNeed,
  deleteEmergencyNeed,
  getActiveNeeds,
  getEmergencyNeedById,
  listEmergencyNeeds,
  resolveEmergencyNeed,
  updateEmergencyNeed,
} from './need.controller.js';

const ALLOWED_AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/webm',
  'audio/opus',
]);

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio mimetype: ${file.mimetype}`), false);
    }
  },
});

const router = Router();

router.post(
  '/',
  uploadAudio.single('audio'),
  zodValidate(createEmergencyNeedSchema),
  createEmergencyNeed,
);
router.get('/', [cacheMiddleware(300)], listEmergencyNeeds);
router.get('/public/active', [cacheMiddleware(300)], getActiveNeeds);
router.get('/:id', getEmergencyNeedById);
router.put('/:id', zodValidate(updateEmergencyNeedSchema), updateEmergencyNeed);
router.patch('/:id/resolve', resolveEmergencyNeed);
router.delete('/:id', deleteEmergencyNeed);

export default router;
