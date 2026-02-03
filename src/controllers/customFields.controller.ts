import { Request, Response } from 'express';
import { CustomFieldsService } from '../services/customFields.service.js';
import { DataType } from '@prisma/client';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const customFieldsService = new CustomFieldsService();

/**
 * Purpose: Get all custom fields across all categories
 * Used for browsing and selecting existing custom fields to reuse
 */
export const getAllCustomFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = Number(req.user!.org_id);

    const fields = await customFieldsService.findAllMeta(orgId);

    res.json({
      success: true,
      data: serializeBigInt(fields)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch custom fields'
    });
  }
};

export const getCustomFieldsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = Number(categoryIdParam);
    const orgId = Number(req.user!.org_id);

    const fields = await customFieldsService.findMetaByCategory(categoryId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(fields)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch custom fields'
    });
  }
};

export const getCustomFieldById = async (req: Request, res: Response): Promise<void> => {
  try {
    const fieldIdParam = req.params.fieldId;
    if (Array.isArray(fieldIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid field ID' });
      return;
    }
    const fieldId = Number(fieldIdParam);
    const orgId = Number(req.user!.org_id);

    const field = await customFieldsService.findMetaById(fieldId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(field)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Custom field not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch custom field'
    });
  }
};

export const createCustomField = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = Number(categoryIdParam);
    const { name, keyName, dataType, description, enums, meta } = req.body;

    if (!name || !keyName || !dataType) {
      res.status(400).json({
        success: false,
        error: 'name, keyName, and dataType are required'
      });
      return;
    }

    if (!Object.values(DataType).includes(dataType)) {
      res.status(400).json({
        success: false,
        error: 'Invalid dataType. Must be one of: number, text, boolean, json'
      });
      return;
    }

    const orgId = Number(req.user!.org_id);
    const userId = Number(req.user!.id);

    const field = await customFieldsService.createMeta(categoryId, orgId, userId, {
      name,
      keyName,
      dataType,
      description,
      enums,
      meta
    });
    
    res.status(201).json({
      success: true,
      data: serializeBigInt(field)
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found')) status = 404;
      if (error.message.includes('already exists')) status = 409;
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create custom field'
    });
  }
};

/**
 * Purpose: Create custom field by copying from existing field
 * Allows reusing custom field definitions across categories
 */
export const createCustomFieldFromExisting = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = Number(categoryIdParam);
    const { sourceFieldId, name, keyName, description } = req.body;

    if (!sourceFieldId) {
      res.status(400).json({
        success: false,
        error: 'sourceFieldId is required'
      });
      return;
    }

    const orgId = Number(req.user!.org_id);
    const userId = Number(req.user!.id);

    const field = await customFieldsService.createMetaFromExisting(categoryId, orgId, userId, {
      sourceFieldId: Number(sourceFieldId),
      name,
      keyName,
      description
    });
    
    res.status(201).json({
      success: true,
      data: serializeBigInt(field)
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found')) status = 404;
      if (error.message.includes('already exists')) status = 409;
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create custom field from existing'
    });
  }
};

export const updateCustomField = async (req: Request, res: Response): Promise<void> => {
  try {
    const fieldIdParam = req.params.fieldId;
    if (Array.isArray(fieldIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid field ID' });
      return;
    }
    const fieldId = Number(fieldIdParam);
    const { name, description, enums, meta } = req.body;

    if (!name && !description && !enums && !meta) {
      res.status(400).json({
        success: false,
        error: 'At least one field is required'
      });
      return;
    }

    const orgId = Number(req.user!.org_id);
    const userId = Number(req.user!.id);

    const field = await customFieldsService.updateMeta(fieldId, orgId, userId, {
      name,
      description,
      enums,
      meta
    });

    res.json({
      success: true,
      data: serializeBigInt(field)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Custom field not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update custom field'
    });
  }
};

export const deleteCustomField = async (req: Request, res: Response): Promise<void> => {
  try {
    const fieldIdParam = req.params.fieldId;
    if (Array.isArray(fieldIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid field ID' });
      return;
    }
    const fieldId = Number(fieldIdParam);
    const orgId = Number(req.user!.org_id);

    await customFieldsService.deleteMeta(fieldId, orgId);

    res.json({
      success: true,
      data: { message: 'Custom field deleted successfully' }
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Custom field not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete custom field'
    });
  }
};

export const getWorkItemCustomFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    const workItemId = Number(workItemIdParam);
    const orgId = Number(req.user!.org_id);

    const values = await customFieldsService.findValuesByWorkItem(workItemId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(values)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Work item not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch custom field values'
    });
  }
};

export const updateWorkItemCustomFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    const workItemId = Number(workItemIdParam);
    const orgId = Number(req.user!.org_id);

    if (!req.body || Object.keys(req.body).length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one custom field value is required'
      });
      return;
    }

    const values = await customFieldsService.updateValues(workItemId, orgId, req.body);

    res.json({
      success: true,
      data: serializeBigInt(values)
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found')) status = 404;
      if (error.message.includes('expects')) status = 400;
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update custom field values'
    });
  }
};

/**
 * Purpose: Get a single custom field value by fieldId and workItemId
 */
export const getCustomFieldValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    const fieldIdParam = req.params.fieldId;
    
    if (Array.isArray(workItemIdParam) || Array.isArray(fieldIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid parameters' });
      return;
    }
    
    const workItemId = Number(workItemIdParam);
    const fieldId = Number(fieldIdParam);
    const orgId = Number(req.user!.org_id);

    const value = await customFieldsService.getValueByFieldId(workItemId, fieldId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(value)
    });
  } catch (error) {
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get custom field value'
    });
  }
};

/**
 * Purpose: Set/update a single custom field value by fieldId and workItemId
 */
export const setCustomFieldValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    const fieldIdParam = req.params.fieldId;
    const { value } = req.body;
    
    if (Array.isArray(workItemIdParam) || Array.isArray(fieldIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid parameters' });
      return;
    }

    if (value === undefined) {
      res.status(400).json({ success: false, error: 'value is required in request body' });
      return;
    }
    
    const workItemId = Number(workItemIdParam);
    const fieldId = Number(fieldIdParam);
    const orgId = Number(req.user!.org_id);

    const updated = await customFieldsService.setValueByFieldId(workItemId, fieldId, value, orgId);

    res.json({
      success: true,
      data: serializeBigInt(updated)
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found')) status = 404;
      if (error.message.includes('expects')) status = 400;
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set custom field value'
    });
  }
};

/**
 * Purpose: Delete a single custom field value by fieldId and workItemId
 */
export const deleteCustomFieldValue = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    const fieldIdParam = req.params.fieldId;
    
    if (Array.isArray(workItemIdParam) || Array.isArray(fieldIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid parameters' });
      return;
    }
    
    const workItemId = Number(workItemIdParam);
    const fieldId = Number(fieldIdParam);
    const orgId = Number(req.user!.org_id);

    const result = await customFieldsService.deleteValueByFieldId(workItemId, fieldId, orgId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete custom field value'
    });
  }
};
