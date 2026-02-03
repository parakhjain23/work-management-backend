import { Request, Response } from 'express';
import { FollowersService } from '../services/followers.service.js';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const followersService = new FollowersService();

/**
 * Purpose: Get all followers for a category
 */
export const getCategoryFollowers = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = Number(categoryIdParam);
    const orgId = Number(req.user!.org_id);

    const followers = await followersService.getFollowersByCategory(categoryId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(followers)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch followers'
    });
  }
};

/**
 * Purpose: Get all categories followed by current user
 */
export const getMyFollowedCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = Number(req.user!.id);
    const orgId = Number(req.user!.org_id);

    const followedCategories = await followersService.getCategoriesFollowedByUser(userId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(followedCategories)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch followed categories'
    });
  }
};

/**
 * Purpose: Check if current user is following a category
 */
export const checkFollowingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = Number(categoryIdParam);
    const userId = Number(req.user!.id);
    const orgId = Number(req.user!.org_id);

    const isFollowing = await followersService.isFollowing(categoryId, userId, orgId);

    res.json({
      success: true,
      data: { isFollowing }
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check following status'
    });
  }
};

/**
 * Purpose: Follow a category
 */
export const followCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = Number(categoryIdParam);
    const userId = Number(req.user!.id);
    const orgId = Number(req.user!.org_id);

    const follower = await followersService.followCategory(categoryId, userId, orgId);

    res.status(201).json({
      success: true,
      data: serializeBigInt(follower)
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message === 'Category not found') status = 404;
      if (error.message === 'Already following this category') status = 409;
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to follow category'
    });
  }
};

/**
 * Purpose: Unfollow a category
 */
export const unfollowCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = Number(categoryIdParam);
    const userId = Number(req.user!.id);
    const orgId = Number(req.user!.org_id);

    const result = await followersService.unfollowCategory(categoryId, userId, orgId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message === 'Category not found') status = 404;
      if (error.message === 'Not following this category') status = 404;
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unfollow category'
    });
  }
};

/**
 * Purpose: Get follower count for a category
 */
export const getCategoryFollowerCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = Number(categoryIdParam);
    const orgId = Number(req.user!.org_id);

    const count = await followersService.getFollowerCount(categoryId, orgId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get follower count'
    });
  }
};
