import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// En GitHub Pages la app vive bajo /AdmCursosUMSS/, no en la raíz: sin este
// basename, React Router buscaría /certificados y GH Pages devolvería 404.
// Vite define BASE_URL según `base` del vite.config ('/' en dev, el subdirectorio
// en producción), así que el mismo código sirve para ambos entornos.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
