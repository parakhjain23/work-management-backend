import { Router } from 'express';
import { getSchema } from '../ai/schema.controller.js';

const router = Router();

router.get('/ai/schema', getSchema);

export default router;
