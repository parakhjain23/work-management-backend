import { Router } from 'express';
import {
  getCategoryFollowers,
  getMyFollowedCategories,
  checkFollowingStatus,
  followCategory,
  unfollowCategory,
  getCategoryFollowerCount
} from '../controllers/followers.controller.js';

const router = Router();

router.get('/categories/:categoryId/followers', getCategoryFollowers);
router.get('/categories/:categoryId/followers/count', getCategoryFollowerCount);
router.get('/categories/:categoryId/followers/status', checkFollowingStatus);
router.post('/categories/:categoryId/followers', followCategory);
router.delete('/categories/:categoryId/followers', unfollowCategory);
router.get('/my-followed-categories', getMyFollowedCategories);

export default router;
