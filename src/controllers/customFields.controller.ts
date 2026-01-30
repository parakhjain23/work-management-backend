import { Request, Response } from 'express';
import { CustomFieldsService } from '../services/customFields.service.js';
import { DataType } from '@prisma/client';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const customFieldsService = new CustomFieldsService();

export const getCustomFieldsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = BigInt(categoryIdParam);
    const orgId = BigInt(req.user!.org_id);

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
    const fieldId = BigInt(fieldIdParam);
    const orgId = BigInt(req.user!.org_id);

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
    const categoryId = BigInt(categoryIdParam);
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

    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

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
      data: field
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

export const updateCustomField = async (req: Request, res: Response): Promise<void> => {
  try {
    const fieldIdParam = req.params.fieldId;
    if (Array.isArray(fieldIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid field ID' });
      return;
    }
    const fieldId = BigInt(fieldIdParam);
    const { name, description, enums, meta } = req.body;

    if (!name && !description && !enums && !meta) {
      res.status(400).json({
        success: false,
        error: 'At least one field is required'
      });
      return;
    }

    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

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
    const fieldId = BigInt(fieldIdParam);
    const orgId = BigInt(req.user!.org_id);

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
    const workItemId = BigInt(workItemIdParam);
    const orgId = BigInt(req.user!.org_id);

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
    const workItemId = BigInt(workItemIdParam);
    const orgId = BigInt(req.user!.org_id);

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
