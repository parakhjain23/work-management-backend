import { Router } from 'express';
import { getConditionGeneratorData } from '../controllers/conditionGenerator.controller.js';

const router = Router();

// No auth middleware - this is reference data for AI
router.get('/condition-generator-data', getConditionGeneratorData);

export default router;
