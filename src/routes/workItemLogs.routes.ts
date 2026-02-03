import { Router } from 'express';
import { getWorkItemLogs } from '../controllers/workItemLogs.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/work-items/:workItemId/logs', mockAuthMiddleware, getWorkItemLogs);

export default router;
