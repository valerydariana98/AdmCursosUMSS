## Descripción

Diagramador visual de plantillas (HU-02): subida de imagen base con validación de
resolución en cliente (y de nuevo en servidor), clic sobre la previsualización
para añadir bloques de texto centrados que crecen hacia ambos lados, arrastre
nativo para mover textos y firmas, panel lateral con contenido, alineación, tamaño,
fuente, color y ancho del bloque, inserción de variables en la posición del cursor,
galería de firmas arrastrable, vista previa de las variables resueltas y guardado
en coordenadas porcentuales. La misma vista sirve para crear y editar.

## Issue relacionada

Closes # (HU-02)

## Cambios realizados

- [x] `CertificateEditorPage.tsx`: formulario, carga en edición, guardado
- [x] `CertificateCanvas.tsx`: lienzo con drag nativo y conversión a porcentajes
- [x] `ElementPropsPanel.tsx`: propiedades del elemento seleccionado
- [x] `nuevoIdTemporal`, `acotarPercent` para elementos nuevos

## Pruebas realizadas

- [x] Build de `client` (tsc + vite) sin errores
- [ ] Pruebas funcionales (pendiente de BD y backend corriendo)
- [ ] Pruebas unitarias
- [ ] Pruebas de integración

## Checklist

- [x] El código cumple las convenciones definidas por el equipo.
- [ ] Se realizaron las pruebas correspondientes.
- [x] No se han introducido errores conocidos.
- [x] La Issue relacionada está correctamente vinculada.