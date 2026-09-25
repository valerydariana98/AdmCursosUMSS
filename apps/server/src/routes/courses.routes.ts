import { Router } from 'express';
import {
  createCourse,
  getCourse,
  getCourses,
  updateCourse,
} from '../controllers/courses.controller.js';
import { validate } from '../middlewares/validate.js';
import { createCourseSchema } from '../schemas/course.schema.js';

const router = Router();

router.get('/', getCourses);
router.get('/:id', getCourse);
router.post('/', validate(createCourseSchema), createCourse);
router.put('/:id', validate(createCourseSchema), updateCourse);

export default router;