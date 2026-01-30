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
  updateWorkItemCustomFields
} from '../controllers/customFields.controller.js';

const router = Router();

router.get('/custom-fields', getAllCustomFields);
router.get('/categories/:categoryId/custom-fields', getCustomFieldsByCategory);
router.get('/custom-fields/:fieldId', getCustomFieldById);
router.post('/categories/:categoryId/custom-fields', createCustomField);
router.post('/categories/:categoryId/custom-fields/from-existing', createCustomFieldFromExisting);
router.patch('/custom-fields/:fieldId', updateCustomField);
router.delete('/custom-fields/:fieldId', deleteCustomField);
router.get('/work-items/:workItemId/custom-fields', getWorkItemCustomFields);
router.patch('/work-items/:workItemId/custom-fields', updateWorkItemCustomFields);

export default router;
