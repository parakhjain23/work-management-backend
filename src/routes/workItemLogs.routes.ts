import { Router } from 'express';
import { getWorkItemLogs } from '../controllers/workItemLogs.controller.js';
import { authMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/work-items/:workItemId/logs', authMiddleware, getWorkItemLogs);

export default router;
