// apps/client/src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./layout/Sidebar";
import ComingSoonPage from "./pages/ComingSoonPage";
import CourseCreatePage from "./pages/courses/CourseCreatePage";
import CourseEditPage from "./pages/courses/CourseEditPage";
import CoursesListPage from "./pages/courses/CoursesListPage";
import GroupCreatePage from "./pages/groups/GroupCreatePage";
import GroupDetailPage from "./pages/groups/GroupDetailPage";
import GroupEditPage from "./pages/groups/GroupEditPage";
import GroupAttendancePage from "./pages/groups/GroupAttendancePage";
import GroupGradesPage from "./pages/groups/GroupGradesPage";
import GroupRubricPage from "./pages/groups/GroupRubricPage";
import GroupReportPage from "./pages/groups/GroupReportPage";
import GroupsPage from "./pages/groups/GroupsPage";
import GroupsListPage from "./pages/groups/GroupsListPage";
import GroupStudentsPage from "./pages/groups/GroupStudentsPage";
import MyGroupsPage from "./pages/groups/MyGroupsPage";
import TempStudentsRedirect from "./pages/groups/TempStudentsRedirect";
import InstructorsContainer from "./pages/instructors/InstructorsContainer";
import EditEnrollmentPage from "./pages/EditEnrollmentPage";
import EnrollmentPage from "./pages/EnrollmentPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import Prueba from "./pages/Prueba";
import ProtectedRoute, { homeForRol } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";

// Las pantallas de administración sólo las alcanza un ADMIN (HU #27).
const soloAdmin = (element: React.ReactElement) => (
  <ProtectedRoute roles={["ADMIN"]}>{element}</ProtectedRoute>
);

const autenticado = (element: React.ReactElement) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

export default function App() {
  const { user, loading } = useAuth();

  // Antes de resolver la sesión no se dibuja nada: evita un destello de
  // rutas protegidas hacia las que todavía no se tiene acceso.
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-gray-400">
        Cargando...
      </div>
    );
  }

  // El login va fuera del layout con sidebar.
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    // `app-shell`/`app-content` son los puntos donde la hoja de impresión (#36)
    // desarma el marco para que sólo salga el documento en el papel.
    <div className="app-shell flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">
      <Sidebar />

      <main className="app-content flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to={homeForRol(user.rol)} replace />} />

          {/* Grupos del docente (HU #28). El ADMIN no tiene instructor, así que
              esta vista no aplica a su rol. */}
          <Route
            path="/mis-grupos"
            element={
              <ProtectedRoute roles={["DOCENTE"]}>
                <MyGroupsPage />
              </ProtectedRoute>
            }
          />

          {/* Detalle y gestión de un grupo (HU #67) */}
          <Route
            path="/grupos/:id/gestion"
            element={autenticado(<GroupDetailPage />)}
          />

          {/* Cursos */}
          <Route path="/cursos" element={soloAdmin(<CoursesListPage />)} />
          <Route path="/cursos/nuevo" element={soloAdmin(<CourseCreatePage />)} />
          <Route path="/cursos/:id/editar" element={soloAdmin(<CourseEditPage />)} />

          {/* Grupos de un curso (HU #18, #19) */}
          <Route
            path="/cursos/:idCurso/grupos"
            element={soloAdmin(<GroupsListPage />)}
          />
          <Route
            path="/cursos/:idCurso/grupos/nuevo"
            element={soloAdmin(<GroupCreatePage />)}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/editar"
            element={soloAdmin(<GroupEditPage />)}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/rubrica"
            element={autenticado(<GroupRubricPage />)}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/asistencia"
            element={autenticado(<GroupAttendancePage />)}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/reporte"
            element={autenticado(<GroupReportPage />)}
          />
          <Route
            path="/cursos/:idCurso/grupos/:idGrupo/notas"
            element={<GroupGradesPage />}
          />

          {/* Estudiantes inscritos por grupo */}
          <Route
            path="/cursos/:idCurso/estudiantes"
            element={soloAdmin(<GroupStudentsPage />)}
          />
          <Route
            path="/groups/:groupId/students-temp"
            element={autenticado(<TempStudentsRedirect />)}
          />

          {/* Instructores (otra HU) */}
          <Route path="/instructores" element={soloAdmin(<InstructorsContainer />)} />

          {/* Catálogo de componentes y secciones generales */}
          <Route path="/prueba" element={autenticado(<Prueba />)} />

          {/* Secciones de otros colaboradores */}
          <Route path="/dashboard" element={autenticado(<Prueba />)} />
          <Route path="/grupos" element={soloAdmin(<GroupsPage />)} />
          <Route
            path="/estudiantes"
            element={autenticado(<ComingSoonPage title="Estudiantes" />)}
          />
          <Route
            path="/certificados"
            element={autenticado(<ComingSoonPage title="Certificados" />)}
          />

          {/* Rutas de Estudiantes por Grupo */}
          <Route
            path="/groups/:groupId/enroll"
            element={autenticado(<EnrollmentPage />)}
          />
          <Route
            path="/groups/:groupId/enrollments/:enrollmentId/edit"
            element={autenticado(<EditEnrollmentPage />)}
          />

          <Route path="/login" element={<Navigate to={homeForRol(user.rol)} replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
