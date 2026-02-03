import { Router } from 'express';
import {
  getCategoryFollowers,
  getMyFollowedCategories,
  checkFollowingStatus,
  followCategory,
  unfollowCategory,
  getCategoryFollowerCount
} from '../controllers/followers.controller.js';
import { authMiddleware } from '../middleware/auth.proxy.js';

const router = Router();

router.get('/categories/:categoryId/followers', authMiddleware, getCategoryFollowers);
router.get('/categories/:categoryId/followers/count', authMiddleware, getCategoryFollowerCount);
router.get('/categories/:categoryId/followers/status', authMiddleware, checkFollowingStatus);
router.post('/categories/:categoryId/followers', authMiddleware, followCategory);
router.delete('/categories/:categoryId/followers', authMiddleware, unfollowCategory);
router.get('/my-followed-categories', authMiddleware, getMyFollowedCategories);

export default router;
