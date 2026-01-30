import { Request, Response } from 'express';
import { CategoriesService } from '../services/categories.service.js';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const categoriesService = new CategoriesService();

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = BigInt(req.user!.org_id);
    const categories = await categoriesService.findAll(orgId);

    res.json({
      success: true,
      data: serializeBigInt(categories)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch categories'
    });
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = BigInt(categoryIdParam);
    const orgId = BigInt(req.user!.org_id);

    const category = await categoriesService.findById(categoryId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(category)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch category'
    });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { keyName, name, externalTool } = req.body;

    if (!keyName || !name) {
      res.status(400).json({
        success: false,
        error: 'keyName and name are required'
      });
      return;
    }

    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

    const category = await categoriesService.create(orgId, userId, {
      keyName,
      name,
      externalTool
    });

    res.status(201).json({
      success: true,
      data: serializeBigInt(category)
    });
  } catch (error) {
    const status = error instanceof Error && error.message.includes('already exists') ? 409 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create category'
    });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = BigInt(categoryIdParam);
    const { name, externalTool } = req.body;

    if (!name && !externalTool) {
      res.status(400).json({
        success: false,
        error: 'At least one field (name or externalTool) is required'
      });
      return;
    }

    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

    const category = await categoriesService.update(categoryId, orgId, userId, {
      name,
      externalTool
    });

    res.json({
      success: true,
      data: serializeBigInt(category)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update category'
    });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = BigInt(categoryIdParam);
    const orgId = BigInt(req.user!.org_id);

    await categoriesService.delete(categoryId, orgId);

    res.json({
      success: true,
      data: { message: 'Category deleted successfully' }
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message === 'Category not found') status = 404;
      if (error.message.includes('existing work items')) status = 409;
    }

    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete category'
    });
  }
};
