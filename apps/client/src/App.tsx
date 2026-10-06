// apps/client/src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import ComingSoonPage from "./pages/ComingSoonPage";
import CourseCreatePage from "./pages/courses/CourseCreatePage";
import CourseEditPage from "./pages/courses/CourseEditPage";
import CoursesListPage from "./pages/courses/CoursesListPage";
import GroupCreatePage from "./pages/groups/GroupCreatePage";
import GroupEditPage from "./pages/groups/GroupEditPage";
import GroupAttendancePage from "./pages/groups/GroupAttendancePage";
import GroupGradesPage from "./pages/groups/GroupGradesPage";
import GroupRubricPage from "./pages/groups/GroupRubricPage";
import GroupsPage from "./pages/groups/GroupsPage";
import GroupsListPage from "./pages/groups/GroupsListPage";
import GroupStudentsPage from "./pages/groups/GroupStudentsPage";
import TempStudentsRedirect from "./pages/groups/TempStudentsRedirect";
import InstructorsContainer from "./pages/instructors/InstructorsContainer";
import EditEnrollmentPage from "./pages/EditEnrollmentPage";
import EnrollmentPage from "./pages/EnrollmentPage";
import NotFoundPage from "./pages/NotFoundPage";
import Prueba from "./pages/Prueba";

export default function App() {
  return (
    // `app-shell`/`app-content` son los puntos donde la hoja de impresión (#36)
    // desarma el marco para que sólo salga el documento en el papel.
    <div className="app-shell flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar />

      <main className="app-content flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/cursos" replace />} />

          {/* Cursos */}
          <Route path="/cursos" element={<CoursesListPage />} />
          <Route path="/cursos/nuevo" element={<CourseCreatePage />} />
          <Route path="/cursos/:id/editar" element={<CourseEditPage />} />

          {/* Grupos de un curso (HU #18, #19) */}
          <Route path="/cursos/:idCurso/grupos" element={<GroupsListPage />} />
          <Route
            path="/cursos/:idCurso/grupos/nuevo"
            element={<GroupCreatePage />}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/editar"
            element={<GroupEditPage />}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/rubrica"
            element={<GroupRubricPage />}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/asistencia"
            element={<GroupAttendancePage />}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/notas"
            element={<GroupGradesPage />}
          />

          {/* Estudiantes inscritos por grupo */}
          <Route
            path="/cursos/:idCurso/estudiantes"
            element={<GroupStudentsPage />}
          />
          <Route
            path="/groups/:groupId/students-temp"
            element={<TempStudentsRedirect />}
          />

          {/* Instructores (otra HU) */}
          <Route path="/instructores" element={<InstructorsContainer />} />

          {/* Catálogo de componentes y secciones generales */}
          <Route path="/prueba" element={<Prueba />} />

          {/* Secciones de otros colaboradores */}
          <Route path="/dashboard" element={<Prueba />} />
          <Route path="/grupos" element={<GroupsPage />} />
          <Route
            path="/estudiantes"
            element={<ComingSoonPage title="Estudiantes" />}
          />
          <Route
            path="/certificados"
            element={<ComingSoonPage title="Certificados" />}
          />

          {/* Rutas de Estudiantes por Grupo */}
          <Route path="/groups/:groupId/enroll" element={<EnrollmentPage />} />
          <Route
            path="/groups/:groupId/enrollments/:enrollmentId/edit"
            element={<EditEnrollmentPage />}
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
