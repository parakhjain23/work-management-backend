import { Router } from 'express';
import { getWorkItemLogs } from '../controllers/workItemLogs.controller.js';

const router = Router();

router.get('/work-items/:workItemId/logs', getWorkItemLogs);

export default router;
