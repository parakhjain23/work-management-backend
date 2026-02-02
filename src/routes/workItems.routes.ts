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

const router = Router();

router.get('/', getWorkItems);
router.get('/:workItemId/full-data', getWorkItemFullData);
router.get('/:workItemId/children', getWorkItemChildren);
router.get('/:workItemId/custom-fields', getWorkItemCustomFields);
router.get('/:workItemId/custom-fields/:fieldId/value', getCustomFieldValue);
router.get('/:workItemId', getWorkItemById);
router.post('/', createWorkItem);
router.post('/:workItemId/children', createWorkItemChild);
router.patch('/:workItemId', updateWorkItem);
router.patch('/:workItemId/custom-fields', updateWorkItemCustomFields);
router.put('/:workItemId/custom-fields/:fieldId/value', setCustomFieldValue);
router.delete('/:workItemId', deleteWorkItem);
router.delete('/:workItemId/custom-fields/:fieldId/value', deleteCustomFieldValue);

export default router;
