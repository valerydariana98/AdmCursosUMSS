// apps/client/src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import ComingSoonPage from "./pages/ComingSoonPage";
import CourseCreatePage from "./pages/courses/CourseCreatePage";
import CourseEditPage from "./pages/courses/CourseEditPage";
import CoursesListPage from "./pages/courses/CoursesListPage";
import InstructorsContainer from "./pages/instructors/InstructorsContainer";
import NotFoundPage from "./pages/NotFoundPage";
import Prueba from "./pages/Prueba";
import GroupPage from "./pages/GroupPage";
import TempStudentsPage from "./pages/TempStudentsPage";
import EnrollmentPage from "./pages/EnrollmentPage";
import EditEnrollmentPage from "./pages/EditEnrollmentPage";

export default function App() {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/cursos" replace />} />

          {/* Cursos */}
          <Route path="/cursos" element={<CoursesListPage />} />
          <Route path="/cursos/nuevo" element={<CourseCreatePage />} />
          <Route path="/cursos/:id/editar" element={<CourseEditPage />} />

          {/* Instructores */}
          <Route path="/instructores" element={<InstructorsContainer />} />

          {/* Catálogo de componentes y secciones generales */}
          <Route path="/prueba" element={<Prueba />} />
          <Route path="/dashboard" element={<Prueba />} />
          <Route path="/grupos" element={<ComingSoonPage title="Grupos" />} />
          <Route path="/estudiantes" element={<ComingSoonPage title="Estudiantes" />} />
          <Route path="/certificados" element={<ComingSoonPage title="Certificados" />} />

          {/* Rutas de Estudiantes por Grupo (coincidentes con TempStudentsPage) */}
          <Route path="/groups/:groupId/students-temp" element={<TempStudentsPage />} />
          <Route path="/groups/:groupId/enroll" element={<EnrollmentPage />} />
          <Route path="/groups/:groupId/enrollments/:enrollmentId/edit" element={<EditEnrollmentPage />} />

        </Routes>
      </main>
    </div>
  );
}