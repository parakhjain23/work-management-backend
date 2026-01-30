import { Router } from 'express';
import { executeSql } from '../ai/sql.controller.js';

const router = Router();

router.post('/ai/execute-sql', executeSql);

export default router;
