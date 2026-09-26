// apps/client/src/App.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import ComingSoonPage from './pages/ComingSoonPage';
import CourseCreatePage from './pages/courses/CourseCreatePage';
import CourseEditPage from './pages/courses/CourseEditPage';
import CoursesListPage from './pages/courses/CoursesListPage';
import InstructorsContainer from './pages/instructors/InstructorsContainer';
import NotFoundPage from './pages/NotFoundPage';
import Prueba from './pages/Prueba';

export default function App() {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/cursos" replace />} />

          {/* Cursos (HU #11, #12, #13, #21) */}
          <Route path="/cursos" element={<CoursesListPage />} />
          <Route path="/cursos/nuevo" element={<CourseCreatePage />} />
          <Route path="/cursos/:id/editar" element={<CourseEditPage />} />

          {/* Instructores (otra HU) */}
          <Route path="/instructores" element={<InstructorsContainer />} />

          {/* Catálogo de componentes */}
          <Route path="/prueba" element={<Prueba />} />

          {/* Secciones de otros colaboradores */}
          <Route path="/dashboard"  element={<Prueba />} />
          <Route path="/grupos" element={<ComingSoonPage title="Grupos" />} />
          <Route path="/estudiantes" element={<ComingSoonPage title="Estudiantes" />} />
          <Route path="/certificados" element={<ComingSoonPage title="Certificados" />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}