import { app } from './app.js';
import { prepararUploads } from './services/imagen.service.js';
import { instalarMarcosBase } from './services/marcosBase.service.js';

const PORT = Number(process.env.PORT) || 3001;

// Las carpetas de fondos, firmas y generados se crean antes de escuchar: si
// faltara una, la primera subida fallaría en el peor momento (con un usuario
// esperando) en lugar de al arrancar el servidor.
prepararUploads()
  .then(() => instalarMarcosBase())
  .catch((error) => {
    console.error('No se pudieron preparar las carpetas de subidas:', error);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Servidor listo en http://localhost:${PORT}`);
    });
  });