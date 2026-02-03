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
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/', mockAuthMiddleware, getCategories);
router.get('/:categoryId', mockAuthMiddleware, getCategoryById);
router.get('/:categoryId/work-items', mockAuthMiddleware, getWorkItemsByCategory);
router.get('/:categoryId/custom-fields', mockAuthMiddleware, getCustomFieldsByCategory);
router.post('/', mockAuthMiddleware, createCategory);
router.post('/:categoryId/custom-fields', mockAuthMiddleware, createCustomField);
router.post('/:categoryId/custom-fields/from-existing', mockAuthMiddleware, createCustomFieldFromExisting);
router.patch('/:categoryId', mockAuthMiddleware, updateCategory);
router.delete('/:categoryId', mockAuthMiddleware, deleteCategory);

export default router;
