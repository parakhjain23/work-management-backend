import { Router } from 'express';
import {
  getAllCustomFields,
  getCustomFieldsByCategory,
  getCustomFieldById,
  createCustomField,
  createCustomFieldFromExisting,
  updateCustomField,
  deleteCustomField,
  getWorkItemCustomFields,
  updateWorkItemCustomFields,
  getCustomFieldValue,
  setCustomFieldValue,
  deleteCustomFieldValue
} from '../controllers/customFields.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

// Custom field metadata routes (under /api/custom-fields)
router.get('/', mockAuthMiddleware, getAllCustomFields);
router.get('/:fieldId', mockAuthMiddleware, getCustomFieldById);
router.patch('/:fieldId', mockAuthMiddleware, updateCustomField);
router.delete('/:fieldId', mockAuthMiddleware, deleteCustomField);

export default router;
