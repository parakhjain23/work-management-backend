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
import { authMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/', authMiddleware, getWorkItems);
router.get('/:workItemId/full-data', authMiddleware, getWorkItemFullData);
router.get('/:workItemId/children', authMiddleware, getWorkItemChildren);
router.get('/:workItemId/custom-fields', authMiddleware, getWorkItemCustomFields);
router.get('/:workItemId/custom-fields/:fieldId/value', authMiddleware, getCustomFieldValue);
router.get('/:workItemId', authMiddleware, getWorkItemById);
router.post('/', authMiddleware, createWorkItem);
router.post('/:workItemId/children', authMiddleware, createWorkItemChild);
router.patch('/:workItemId', authMiddleware, updateWorkItem);
router.patch('/:workItemId/custom-fields', authMiddleware, updateWorkItemCustomFields);
router.put('/:workItemId/custom-fields/:fieldId/value', authMiddleware, setCustomFieldValue);
router.delete('/:workItemId', authMiddleware, deleteWorkItem);
router.delete('/:workItemId/custom-fields/:fieldId/value', authMiddleware, deleteCustomFieldValue);

export default router;
