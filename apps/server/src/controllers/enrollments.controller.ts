import type { Request, Response, NextFunction } from "express";
import {
  createEnrollment as createEnrollmentService,
  deleteEnrollment as deleteEnrollmentService,
  listEnrollments as listEnrollmentsService,
  listStudentTypes as listStudentTypesService,
  moveEnrollment as moveEnrollmentService,
  updateEnrollment as updateEnrollmentService,
} from "../services/enrollments.service.js";

const ERRORS = {
  group_not_found: { status: 404, message: "Grupo no encontrado" },
  group_closed: { status: 409, message: "El grupo no admite inscripciones" },
  group_full: { status: 409, message: "El grupo alcanzó su cupo máximo" },
  invalid_student_type: { status: 400, message: "Tipo de estudiante inválido" },
  already_enrolled: {
    status: 409,
    message: "El estudiante ya está inscrito en este grupo",
  },
  enrollment_not_found: { status: 404, message: "Inscripción no encontrada" },
  move_not_allowed: {
    status: 409,
    message:
      "Solo se puede cambiar de grupo mientras el grupo está en preinscripción",
  },
  ci_taken: { status: 409, message: "Ese CI ya pertenece a otro estudiante" },
  same_group: { status: 400, message: "El estudiante ya pertenece a ese grupo" },
  different_course: {
    status: 400,
    message: "Solo se puede cambiar a un grupo del mismo curso",
  },
} as const;

export const createEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await createEnrollmentService(
      Number(req.params.id),
      req.body,
    );
    const errorCode = "error" in result ? result.error : undefined;

    if (typeof errorCode === "string" && errorCode in ERRORS) {
      const key = errorCode as keyof typeof ERRORS;
      const { status, message } = ERRORS[key];
      res.status(status).json({ message });
      return;
    }

    if ("data" in result) {
      res.status(201).json(result.data);
      return;
    }

    next(new Error("Respuesta inesperada del servicio de inscripción"));
  } catch (error) {
    next(error);
  }
};

export const getEnrollments = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await listEnrollmentsService(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
};

export const getStudentTypes = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.json(await listStudentTypesService());
  } catch (error) {
    next(error);
  }
};
export const updateEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await updateEnrollmentService(
      Number(req.params.id),
      Number(req.params.enrollmentId),
      req.body,
    );
    const errorCode = "error" in result ? result.error : undefined;
    if (typeof errorCode === "string" && errorCode in ERRORS) {
      const { status, message } = ERRORS[errorCode as keyof typeof ERRORS];
      res.status(status).json({ message });
      return;
    }
    if ("data" in result) {
      res.json(result.data);
      return;
    }
    next(new Error("Respuesta inesperada al editar la inscripción"));
  } catch (error) {
    next(error);
  }
};

export const deleteEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await deleteEnrollmentService(
      Number(req.params.id),
      Number(req.params.enrollmentId),
    );

    if (!result.ok) {
      const { status, message } = ERRORS[result.reason];
      res.status(status).json({ message });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const moveEnrollment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await moveEnrollmentService(
      Number(req.params.id),
      Number(req.params.enrollmentId),
      Number(req.body.idGrupoDestino),
    );

    const errorCode = "error" in result ? result.error : undefined;
    if (typeof errorCode === "string" && errorCode in ERRORS) {
      const { status, message } = ERRORS[errorCode as keyof typeof ERRORS];
      res.status(status).json({ message });
      return;
    }

    if ("data" in result) {
      res.json(result.data);
      return;
    }
    next(new Error("Respuesta inesperada al cambiar de grupo"));
  } catch (error) {
    next(error);
  }
};