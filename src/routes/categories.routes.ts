import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categories.controller.js';
import { getWorkItemsByCategory } from '../controllers/workItems.controller.js';
import { 
  getCustomFieldsByCategory, 
  createCustomField, 
  createCustomFieldFromExisting 
} from '../controllers/customFields.controller.js';

const router = Router();

router.get('/', getCategories);
router.get('/:categoryId', getCategoryById);
router.get('/:categoryId/work-items', getWorkItemsByCategory);
router.get('/:categoryId/custom-fields', getCustomFieldsByCategory);
router.post('/', createCategory);
router.post('/:categoryId/custom-fields', createCustomField);
router.post('/:categoryId/custom-fields/from-existing', createCustomFieldFromExisting);
router.patch('/:categoryId', updateCategory);
router.delete('/:categoryId', deleteCategory);

export default router;
