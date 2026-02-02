import { Request, Response } from 'express';
import { WorkItemsService, WorkItemFilters } from '../services/workItems.service.js';
import { WorkItemStatus, WorkItemPriority } from '@prisma/client';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const workItemsService = new WorkItemsService();

export const getWorkItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = BigInt(req.user!.org_id);
    
    const filters: WorkItemFilters = {};
    
    if (req.query.categoryId) {
      filters.categoryId = BigInt(req.query.categoryId as string);
    }
    if (req.query.status && typeof req.query.status === 'string') {
      filters.status = req.query.status as WorkItemStatus;
    }
    if (req.query.priority && typeof req.query.priority === 'string') {
      filters.priority = req.query.priority as WorkItemPriority;
    }
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string, 10);
    }
    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10);
    }

    const workItems = await workItemsService.findAll(orgId, filters);

    res.json({
      success: true,
      data: serializeBigInt(workItems)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch work items'
    });
  }
};

export const getWorkItemsByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const categoryIdParam = req.params.categoryId;
    if (Array.isArray(categoryIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid category ID' });
      return;
    }
    const categoryId = BigInt(categoryIdParam);
    const orgId = BigInt(req.user!.org_id);

    const workItems = await workItemsService.findByCategory(categoryId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(workItems)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Category not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch work items'
    });
  }
};

export const getWorkItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    const workItemId = BigInt(workItemIdParam);
    const orgId = BigInt(req.user!.org_id);

    const workItem = await workItemsService.findById(workItemId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(workItem)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Work item not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch work item'
    });
  }
};

export const createWorkItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, title, description, status, priority, assigneeId, startDate, dueDate, parentId, rootParentId, externalId } = req.body;

    if (!title) {
      res.status(400).json({
        success: false,
        error: 'title is required'
      });
      return;
    }

    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

    const workItem = await workItemsService.create(orgId, userId, {
      title,
      categoryId: categoryId ? BigInt(categoryId) : undefined,
      description,
      status,
      priority,
      assigneeId: assigneeId ? BigInt(assigneeId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      parentId: parentId ? BigInt(parentId) : undefined,
      rootParentId: rootParentId ? BigInt(rootParentId) : undefined,
      externalId
    });

    res.status(201).json({
      success: true,
      data: serializeBigInt(workItem)
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found')) status = 404;
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create work item'
    });
  }
};

export const updateWorkItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    const workItemId = BigInt(workItemIdParam);
    const { title, description, status, priority, categoryId, assigneeId, startDate, dueDate, externalId, createdBy, parentId, rootParentId, docId } = req.body;

    if (!title && !description && !status && !priority && !categoryId && assigneeId === undefined && !startDate && !dueDate && !externalId && createdBy === undefined && parentId === undefined && rootParentId === undefined && !docId) {
      res.status(400).json({
        success: false,
        error: 'At least one field is required'
      });
      return;
    }

    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

    const workItem = await workItemsService.update(workItemId, orgId, userId, {
      title,
      description,
      status,
      priority,
      categoryId: categoryId ? BigInt(categoryId) : undefined,
      assigneeId: assigneeId !== undefined ? (assigneeId ? BigInt(assigneeId) : null) : undefined,
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      externalId: externalId !== undefined ? externalId : undefined,
      createdBy: createdBy !== undefined ? (createdBy ? BigInt(createdBy) : null) : undefined,
      parentId: parentId !== undefined ? (parentId ? BigInt(parentId) : null) : undefined,
      rootParentId: rootParentId !== undefined ? (rootParentId ? BigInt(rootParentId) : null) : undefined,
      docId: docId !== undefined ? docId : undefined
    });

    res.json({
      success: true,
      data: serializeBigInt(workItem)
    });
  } catch (error) {
    let status = 500;
    if (error instanceof Error) {
      if (error.message.includes('not found')) status = 404;
    }
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update work item'
    });
  }
};

export const deleteWorkItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    const workItemId = BigInt(workItemIdParam);
    const orgId = BigInt(req.user!.org_id);

    await workItemsService.delete(workItemId, orgId);

    res.json({
      success: true,
      data: { message: 'Work item deleted successfully' }
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Work item not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete work item'
    });
  }
};

export const getWorkItemChildren = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    const workItemId = BigInt(workItemIdParam);
    const orgId = BigInt(req.user!.org_id);

    const children = await workItemsService.findChildren(workItemId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(children)
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Work item not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch children'
    });
  }
};

export const createWorkItemChild = async (req: Request, res: Response): Promise<void> => {
  try {
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    const parentId = BigInt(workItemIdParam);
    const { title, description, status, priority, assigneeId, startDate, dueDate } = req.body;

    if (!title) {
      res.status(400).json({
        success: false,
        error: 'title is required'
      });
      return;
    }

    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

    const workItem = await workItemsService.createChild(parentId, orgId, userId, {
      categoryId: BigInt(0),
      title,
      description,
      status,
      priority,
      assigneeId: assigneeId ? BigInt(assigneeId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    res.status(201).json({
      success: true,
      data: workItem
    });
  } catch (error) {
    const status = error instanceof Error && error.message === 'Work item not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create child work item'
    });
  }
};

/**
 * Purpose: Get complete work item data including category and custom fields
 * Used for testing, debugging, and AI condition generation reference
 */
export const getWorkItemFullData = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[getWorkItemFullData] Called with params:', req.params);
    const workItemIdParam = req.params.workItemId;
    if (Array.isArray(workItemIdParam)) {
      res.status(400).json({ success: false, error: 'Invalid work item ID' });
      return;
    }
    
    const workItemId = BigInt(workItemIdParam);
    const orgId = BigInt(req.user!.org_id);
    console.log('[getWorkItemFullData] Fetching data for workItemId:', workItemId.toString(), 'orgId:', orgId.toString());

    const fullData = await workItemsService.getFullData(workItemId, orgId);
    console.log('[getWorkItemFullData] Data fetched successfully');

    res.json({
      success: true,
      data: serializeBigInt(fullData)
    });
  } catch (error) {
    console.error('[getWorkItemFullData] Error:', error);
    const status = error instanceof Error && error.message === 'Work item not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch work item full data'
    });
  }
};
