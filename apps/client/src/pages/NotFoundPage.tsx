import { Link } from 'react-router-dom';
import Button from '../components/Button';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <p className="text-5xl font-bold text-gray-200">404</p>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Página no encontrada</h1>
        <p className="text-sm text-gray-500 mt-1">La ruta que buscas no existe.</p>
      </div>
      <Link to="/cursos">
        <Button variant="primary">Ir a Cursos</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;