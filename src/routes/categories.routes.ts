import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categories.controller.js';

const router = Router();

router.get('/categories', getCategories);
router.get('/categories/:categoryId', getCategoryById);
router.post('/categories', createCategory);
router.patch('/categories/:categoryId', updateCategory);
router.delete('/categories/:categoryId', deleteCategory);

export default router;
