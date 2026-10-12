import { Link } from 'react-router-dom';
import Button from '../components/Button';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <p className="font-serif text-[7rem] leading-none font-bold text-line select-none">404</p>
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-dark">Página no encontrada</h1>
        <p className="mt-2 text-sm text-brand-secondary">La ruta que buscas no existe.</p>
      </div>
      <Link to="/cursos">
        <Button variant="primary">Ir a Cursos</Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
