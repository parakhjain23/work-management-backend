import { Router } from 'express';
import { executeIntent } from '../controllers/intent.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

// AI Intent API - Single entrypoint for all AI mutations
router.post('/ai/intent', mockAuthMiddleware, executeIntent);

export default router;
