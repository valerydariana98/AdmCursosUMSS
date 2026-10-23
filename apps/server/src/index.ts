import { app } from './app.js';
import { prepararUploads } from './services/imagen.service.js';
import { restaurarFondos } from './services/fondos.service.js';
import { instalarMarcosBase } from './services/marcosBase.service.js';

const PORT = Number(process.env.PORT) || 3001;

// Las carpetas de fondos y generados se crean antes de escuchar: si
// faltara una, la primera subida fallaría en el peor momento (con un usuario
// esperando) en lugar de al arrancar el servidor.
//
// Los fondos de las plantillas se reescriben desde la base: en Render el disco
// llega vacío después de cada deploy o de que la instancia se duerma.
prepararUploads()
  .then(() => instalarMarcosBase())
  .then(() => restaurarFondos())
  .then((restaurados) => {
    if (restaurados > 0) console.log(`Fondos restaurados desde la base: ${restaurados}`);
  })
  .catch((error) => {
    console.error('No se pudieron preparar las carpetas de subidas:', error);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Servidor listo en http://localhost:${PORT}`);
    });
  });