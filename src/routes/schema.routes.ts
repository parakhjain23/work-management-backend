import { Router } from 'express';
import { getCategories, getCustomFields } from '../controllers/schema.controller.js';

const router = Router();

// Schema APIs for AI agent - No authentication (will add API key later)
router.get('/schema/categories', getCategories);
router.get('/schema/custom-fields', getCustomFields);

export default router;
