import { Router } from 'express';
import { searchWorkItems } from '../controllers/search.controller.js';
import { authMiddleware } from '../middleware/auth.proxy.js';

const router = Router();

/**
 * Purpose: Search work items by query
 * GET /api/search/work-items?query=<search_term>&limit=20&offset=0
 */
router.get('/work-items', authMiddleware, searchWorkItems);

export default router;
