import { Router } from 'express';
import {
  getCategoryFollowers,
  getMyFollowedCategories,
  checkFollowingStatus,
  followCategory,
  unfollowCategory,
  getCategoryFollowerCount
} from '../controllers/followers.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/categories/:categoryId/followers', mockAuthMiddleware, getCategoryFollowers);
router.get('/categories/:categoryId/followers/count', mockAuthMiddleware, getCategoryFollowerCount);
router.get('/categories/:categoryId/followers/status', mockAuthMiddleware, checkFollowingStatus);
router.post('/categories/:categoryId/followers', mockAuthMiddleware, followCategory);
router.delete('/categories/:categoryId/followers', mockAuthMiddleware, unfollowCategory);
router.get('/my-followed-categories', mockAuthMiddleware, getMyFollowedCategories);

export default router;
