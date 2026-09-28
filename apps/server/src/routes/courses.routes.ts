import { Router } from 'express';
import {
  createCourse,
  deleteCourse,
  getCourse,
  getCourses,
  updateCourse,
} from '../controllers/courses.controller.js';
import { validate, validateParams, validateQuery } from '../middlewares/validate.js';
import { coursesQuerySchema, createCourseSchema } from '../schemas/course.schema.js';
import { idParamsSchema } from '../schemas/params.schema.js';

const router = Router();

router.get('/', validateQuery(coursesQuerySchema), getCourses);
router.get('/:id', validateParams(idParamsSchema), getCourse);
router.post('/', validate(createCourseSchema), createCourse);
router.put('/:id', validateParams(idParamsSchema), validate(createCourseSchema), updateCourse);
router.delete('/:id', validateParams(idParamsSchema), deleteCourse);

export default router;