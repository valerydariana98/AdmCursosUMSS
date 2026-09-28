import { Router } from 'express';
import { getStudentTypes } from '../controllers/enrollments.controller.js';

const router = Router();
router.get('/', getStudentTypes);

export default router;