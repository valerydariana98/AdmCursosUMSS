import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { homeForRol } from '../components/ProtectedRoute';

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 outline-none transition focus:border-brand-mid focus:ring-2 focus:ring-brand-mid/15';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Los dos campos son obligatorios (HU #27).
    const missing: Record<string, string> = {};
    if (!username.trim()) missing.username = 'Requerido';
    if (!password) missing.password = 'Requerido';
    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      navigate(homeForRol(user.rol), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors.length > 0) {
          setFieldErrors(
            err.errors.reduce<Record<string, string>>((acc, f) => {
              acc[f.path] = f.message;
              return acc;
            }, {})
          );
        }
      } else {
        setError('No se pudo conectar con el servidor');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-dark text-white font-black rounded-2xl flex items-center justify-center text-2xl shadow-md">
            U
          </div>
          <h1 className="mt-4 text-xl font-bold text-brand-dark">Formación Continua UMSS</h1>
          <p className="text-sm text-gray-500 mt-1">Inicia sesión para continuar</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 space-y-5"
        >
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Nombre de Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
              placeholder="JhonnyRojas2026"
            />
            {fieldErrors.username && (
              <p className="text-xs text-red-600 mt-1.5">{fieldErrors.username}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
            {fieldErrors.password && (
              <p className="text-xs text-red-600 mt-1.5">{fieldErrors.password}</p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-mid transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
