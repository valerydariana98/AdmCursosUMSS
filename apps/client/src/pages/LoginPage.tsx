import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { homeForRol } from '../components/ProtectedRoute';

const inputCls =
  'w-full px-4 py-3 border border-line bg-white text-sm text-brand-dark outline-none transition focus:border-brand-dark focus:ring-4 focus:ring-brand-dark/5 placeholder:text-gray-300';

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
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Portada: panel editorial oscuro. Solo aparece en pantallas grandes. */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-sidebar-bg text-white p-14">
        <span className="absolute inset-y-0 left-0 w-1 bg-stamp" aria-hidden="true" />
        <span
          className="pointer-events-none absolute -right-24 -bottom-32 font-serif font-bold leading-none text-white/[0.04] select-none"
          style={{ fontSize: '34rem' }}
          aria-hidden="true"
        >
          U
        </span>

        <div className="relative flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-white/50">
          <span>Departamento de Informática</span>
          <span>Bolivia</span>
        </div>

        <div className="relative max-w-lg">
          <span className="inline-block h-2 w-2 bg-stamp" aria-hidden="true" />
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.04] tracking-[-0.01em]">
            Universidad
            <br />
            Mayor de
            <br />
            San Simón
          </h1>
          <div className="mt-6 h-[3px] w-24 bg-white/90" />
          <p className="mt-6 text-sm leading-relaxed text-white/60">
            Sistema de gestión de cursos, grupos, inscripciones y certificación
            del Departamento de Informática.
          </p>
        </div>

        <div className="relative flex items-end justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
          <span>Cochabamba · Bolivia</span>
          <span>Dpto. de Informática</span>
        </div>
      </div>

      {/* Acceso */}
      <div className="flex items-center justify-center bg-brand-bg px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="w-12 h-12 bg-brand-dark text-white font-serif font-semibold flex items-center justify-center text-2xl">
              U
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.26em] text-brand-secondary/80">
            <span className="inline-block h-2 w-2 bg-stamp" aria-hidden="true" />
            Acceso al sistema
          </div>

          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tracking-[-0.01em] text-brand-dark">
            Iniciar sesión
          </h1>

          <div className="mt-6 mb-8" aria-hidden="true">
            <div className="h-[3px] bg-rule" />
            <div className="mt-[3px] h-px bg-line" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-brand-secondary">
                Usuario
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. admin"
                autoComplete="username"
                className={`mt-2 ${inputCls}`}
              />
              {fieldErrors.username && (
                <span className="mt-1.5 block text-xs font-medium text-status-error-text">
                  {fieldErrors.username}
                </span>
              )}
            </label>

            <label className="block">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-brand-secondary">
                Contraseña
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`mt-2 ${inputCls}`}
              />
              {fieldErrors.password && (
                <span className="mt-1.5 block text-xs font-medium text-status-error-text">
                  {fieldErrors.password}
                </span>
              )}
            </label>

            {error && (
              <div className="flex items-start gap-3 border border-status-error-text/25 border-l-4 border-l-status-error-text bg-status-error-bg px-4 py-3 text-sm font-medium text-status-error-text">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 bg-status-error-text rounded-full" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-dark px-6 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-brand-mid disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {submitting ? 'Verificando…' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.22em] text-brand-secondary/50">
            Universidad Mayor de San Simón
          </p>
        </div>
      </div>
    </div>
  );
}
