import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Las pruebas del servicio importan el módulo de base, que exige la variable
    // aunque no se abra ninguna conexión: el pool de `pg` es lazy.
    env: {
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    },
  },
});
