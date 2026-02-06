import { Request, Response } from 'express';
import { CategoriesService } from '../services/categories.service.js';
import { CustomFieldsService } from '../services/customFields.service.js';

const categoriesService = new CategoriesService();
const customFieldsService = new CustomFieldsService();

/**
 * Purpose: Get all categories for an organization
 * No authentication - will be protected by API key in future
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { org_id } = req.query;

    // Validate org_id
    if (!org_id) {
      res.status(400).json({
        success: false,
        error: 'org_id is required'
      });
      return;
    }

    const orgId = Number(org_id);

    console.log(`[Schema API] Fetching categories for org: ${orgId}`);

    const categories = await categoriesService.findAll(orgId);

    const data = categories.map(category => ({
      id: category.id,
      name: category.name,
      keyName: category.keyName,
      externalTool: category.externalTool,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }));

    res.json(data);
  } catch (error) {
    console.error('[Schema API] Error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch categories'
    });
  }
};

/**
 * Purpose: Get custom fields for a specific category
 * No authentication - will be protected by API key in future
 */
export const getCustomFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const { org_id, category_id } = req.query;

    // Validate parameters
    if (!org_id || !category_id) {
      res.status(400).json({
        success: false,
        error: 'org_id and category_id are required'
      });
      return;
    }

    const orgId = Number(org_id);
    const categoryId = Number(category_id);

    console.log(`[Schema API] Fetching custom fields for org: ${orgId}, category: ${categoryId}`);

    const customFields = await customFieldsService.findMetaByCategory(categoryId, orgId);

    const data = customFields.map(field => ({
      id: field.id,
      keyName: field.keyName,
      name: field.name,
      dataType: field.dataType,
      description: field.description,
      enums: field.enums,
      meta: field.meta,
      categoryId: field.categoryId,
      createdAt: field.createdAt,
      updatedAt: field.updatedAt
    }));

    res.json(data);
  } catch (error) {
    console.error('[Schema API] Error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch custom fields'
    });
  }
};
