import { Router } from 'express';
import {
  getWorkItems,
  getWorkItemsByCategory,
  getWorkItemById,
  createWorkItem,
  updateWorkItem,
  deleteWorkItem,
  getWorkItemChildren,
  createWorkItemChild,
  getWorkItemFullData
} from '../controllers/workItems.controller.js';
import {
  getWorkItemCustomFields,
  updateWorkItemCustomFields,
  getCustomFieldValue,
  setCustomFieldValue,
  deleteCustomFieldValue
} from '../controllers/customFields.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/', mockAuthMiddleware, getWorkItems);
router.get('/:workItemId/full-data', mockAuthMiddleware, getWorkItemFullData);
router.get('/:workItemId/children', mockAuthMiddleware, getWorkItemChildren);
router.get('/:workItemId/custom-fields', mockAuthMiddleware, getWorkItemCustomFields);
router.get('/:workItemId/custom-fields/:fieldId/value', mockAuthMiddleware, getCustomFieldValue);
router.get('/:workItemId', mockAuthMiddleware, getWorkItemById);
router.post('/', mockAuthMiddleware, createWorkItem);
router.post('/:workItemId/children', mockAuthMiddleware, createWorkItemChild);
router.patch('/:workItemId', mockAuthMiddleware, updateWorkItem);
router.patch('/:workItemId/custom-fields', mockAuthMiddleware, updateWorkItemCustomFields);
router.put('/:workItemId/custom-fields/:fieldId/value', mockAuthMiddleware, setCustomFieldValue);
router.delete('/:workItemId', mockAuthMiddleware, deleteWorkItem);
router.delete('/:workItemId/custom-fields/:fieldId/value', mockAuthMiddleware, deleteCustomFieldValue);

export default router;
