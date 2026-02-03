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
import { authMiddleware } from '../middleware/auth.proxy.js';

const router = Router();

router.get('/', authMiddleware, getCategories);
router.get('/:categoryId', authMiddleware, getCategoryById);
router.get('/:categoryId/work-items', authMiddleware, getWorkItemsByCategory);
router.get('/:categoryId/custom-fields', authMiddleware, getCustomFieldsByCategory);
router.post('/', authMiddleware, createCategory);
router.post('/:categoryId/custom-fields', authMiddleware, createCustomField);
router.post('/:categoryId/custom-fields/from-existing', authMiddleware, createCustomFieldFromExisting);
router.patch('/:categoryId', authMiddleware, updateCategory);
router.delete('/:categoryId', authMiddleware, deleteCategory);

export default router;
