import { Router } from 'express';
import { executeIntent } from '../controllers/intent.controller.js';
import { authMiddleware } from '../middleware/auth.proxy.js';

const router = Router();

// AI Intent API - Single entrypoint for all AI mutations
router.post('/ai/intent', executeIntent);

export default router;
