import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // En GitHub Pages el sitio no vive en la raíz del dominio sino bajo
  // /AdmCursosUMSS/. Sin este base, los assets (JS/CSS) se pedirían a la raíz
  // y darían 404. En dev no está definido, así que sigue sirviendo en '/'.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
});
