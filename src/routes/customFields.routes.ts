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

const router = Router();

// Custom field metadata routes (under /api/custom-fields)
router.get('/', getAllCustomFields);
router.get('/:fieldId', getCustomFieldById);
router.patch('/:fieldId', updateCustomField);
router.delete('/:fieldId', deleteCustomField);

export default router;
