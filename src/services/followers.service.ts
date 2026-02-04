import { getPrismaClient } from '../db/prisma.js';

export class FollowersService {
  private prisma = getPrismaClient();

  /**
   * Purpose: Get all followers for a category
   */
  async getFollowersByCategory(categoryId: number, orgId: number) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return await this.prisma.categoryFollower.findMany({
      where: { categoryId },
      orderBy: { followedAt: 'desc' }
    });
  }

  /**
   * Purpose: Get all categories followed by a user
   */
  async getCategoriesFollowedByUser(userId: number, orgId: number) {
    return await this.prisma.categoryFollower.findMany({
      where: {
        userId,
        category: { orgId }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            keyName: true,
            externalTool: true
          }
        }
      },
      orderBy: { followedAt: 'desc' }
    });
  }

  /**
   * Purpose: Check if user is following a category
   */
  async isFollowing(categoryId: number, userId: number, orgId: number): Promise<boolean> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const follower = await this.prisma.categoryFollower.findFirst({
      where: { categoryId, userId }
    });

    return !!follower;
  }

  /**
   * Purpose: Follow a category
   */
  async followCategory(categoryId: number, userId: number, orgId: number) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const existing = await this.prisma.categoryFollower.findFirst({
      where: { categoryId, userId }
    });

    if (existing) {
      throw new Error('Already following this category');
    }

    return await this.prisma.categoryFollower.create({
      data: {
        categoryId,
        userId
      }
    });
  }

  /**
   * Purpose: Unfollow a category
   */
  async unfollowCategory(categoryId: number, userId: number, orgId: number) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const follower = await this.prisma.categoryFollower.findFirst({
      where: { categoryId, userId }
    });

    if (!follower) {
      throw new Error('Not following this category');
    }

    await this.prisma.categoryFollower.delete({
      where: { id: follower.id }
    });

    return { message: 'Successfully unfollowed category' };
  }

  /**
   * Purpose: Get follower count for a category
   */
  async getFollowerCount(categoryId: number, orgId: number): Promise<number> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, orgId }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    return await this.prisma.categoryFollower.count({
      where: { categoryId }
    });
  }
}
