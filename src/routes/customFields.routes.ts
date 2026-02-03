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
import { authMiddleware } from '../middleware/auth.mock.js';

const router = Router();

// Custom field metadata routes (under /api/custom-fields)
router.get('/', authMiddleware, getAllCustomFields);
router.get('/:fieldId', authMiddleware, getCustomFieldById);
router.patch('/:fieldId', authMiddleware, updateCustomField);
router.delete('/:fieldId', authMiddleware, deleteCustomField);

export default router;
