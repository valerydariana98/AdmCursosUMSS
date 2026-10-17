#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Genera docs/HU_Certificados.docx con las historias de usuario del modulo de
certificados, adaptadas al sistema AdmCursosUMSS (monorepo pnpm: apps/client,
apps/server, packages/shared).

Las historias Adjustadas usan:
  - los roles reales del sistema (ADMIN, DOCENTE) y las rutas reales del cliente;
  - los nombres reales de las columnas de la base de datos (db/schema.ts);
  - la logica real de aprobacion que ya existe en shared
    (resolveCertificateCondition + computeFinalGrade + cursos.notaMin / maxFaltas);
  - los criterios de aceptacion en formato Dado / Cuando / Entonces, como en la
    plantilla de issues del repositorio (.github/ISSUE_TEMPLATE/user-story.md).

Uso:
    python scripts/generar_hu_certificados.py

La salida se escribe en docs/HU_Certificados.docx (carpeta relativa a la raiz del
repositorio, sin importar desde donde se ejecute el script).
"""

from __future__ import annotations

import os
from datetime import date

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

# ---------------------------------------------------------------------------
# Rutas
# ---------------------------------------------------------------------------

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "docs", "HU_Certificados.docx")

# ---------------------------------------------------------------------------
# Datos del documento
# ---------------------------------------------------------------------------

VERSION = "1.0"
FECHA = date.today().strftime("%d/%m/%Y")
PROYECTO = "AdmCursosUMSS — Sistema de Administración de Cursos (UMSS)"
MODULO = "Módulo de Certificados de Cursos"

# Decisiones tecnicas: una sola fuente de verdad, compartida por el documento y
# por las historias de usuario.
DECISIONES = [
    (
        "Resolución de la imagen base",
        "Mínimo 1200 × 800 px, máximo 2500 × 1750 px. Referencia de impresión en "
        "alta calidad: 1920 × 1080 px (16:9) o 2000 × 1414 px (A4 horizontal) a 300 DPI.",
    ),
    (
        "Formatos aceptados",
        "PNG o JPG para la imagen base y para las firmas.",
    ),
    (
        "Formato de exportación",
        "Archivo .zip que contiene un PDF por estudiante, en tamaño carta "
        "horizontal (792 × 612 pt) con texto vectorial. El PDF es el estándar "
        "inalterable para impresión oficial.",
    ),
    (
        "Formato de firmas",
        "Las firmas PNG/JPG se convierten automáticamente a WebP en el servidor "
        "para optimizar el almacenamiento, conservando la transparencia.",
    ),
    (
        "Almacenamiento",
        "Las imágenes se guardan en el sistema de archivos (apps/server/uploads/). "
        "La base de datos almacena únicamente la ruta relativa.",
    ),
    (
        "Definición de aprobado",
        "Estudiante cuya nota final es mayor o igual a la nota mínima del curso "
        "(cursos.notaMin) y cuyas faltas no superan el máximo permitido "
        "(cursos.maxFaltas). Es la misma condición que aplica el reporte de notas.",
    ),
    (
        "Nombre de los archivos generados",
        "Certificado_<Apellidos><Nombres>_<Curso>.pdf, con acentos y espacios "
        "normalizados para que el archivo abra correctamente en cualquier sistema.",
    ),
]

# Dependencias entre historias, en el orden de implementacion.
ORDEN = [
    ("HU-01", "Visualización y gestión del administrador de plantillas", "—"),
    ("HU-03", "Gestión y subida de firmas digitalizadas", "HU-01"),
    ("HU-02", "Creación y personalización de plantillas (diagramador)", "HU-03"),
    ("HU-04", "Generación masiva y descarga de certificados", "HU-02"),
]

VARIABLES = [
    (
        "{nombre_estudiante}",
        "estudiantes.nombres + estudiantes.apPaterno + estudiantes.apMaterno",
    ),
    ("{nombre_curso}", "cursos.nombreCurso"),
    ("{grupo}", "Numero de grupo del grupos.numGrupo (por ejemplo: Grupo 3)"),
    ("{nota_final}", "Nota final ponderada por la rúbrica del grupo"),
    ("{fecha_emision}", "Fecha en que se emite el certificado"),
]


def historia_01() -> dict:
    return {
        "id": "HU-01",
        "titulo": "Visualización y gestión del administrador de plantillas de certificados",
        "rol": "Administrador (ADMIN) o docente (DOCENTE)",
        "descripcion": (
            "Como administrador o docente del sistema, quiero acceder a una vista "
            "principal que liste las plantillas de certificados creadas y filtrarlas "
            "por curso o grupo, para poder administrar, reutilizar o crear nuevos "
            "diseños de certificados de manera organizada."
        ),
        "alcance": [
            "Vista principal en la ruta /certificados, alcanzable desde el ítem "
            "«Certificados» del menú lateral.",
            "Filtro jerárquico: selector de Cursos que habilita el selector de Grupos.",
            "Tabla con nombre de la plantilla, curso y grupo asociados, fecha de "
            "creación, cantidad de elementos y acciones.",
            "Acciones por plantilla: Editar, Duplicar y Eliminar.",
            "Acceso directo a la creación de plantillas y a la generación masiva.",
        ],
        "criterios": [
            (
                "Dado un usuario con sesión iniciada en el sistema, cuando hace clic "
                "en «Certificados» del menú lateral, entonces el sistema lo dirige a "
                "la vista del administrador de certificados en /certificados."
            ),
            (
                "Dado un usuario autenticado, cuando abre la vista de certificados, "
                "entonces ve un selector de Cursos que lista los cursos del periodo "
                "actual."
            ),
            (
                "Dado que no se ha elegido ningún curso, cuando el usuario observa el "
                "selector de Grupos, entonces este aparece deshabilitado y vacío."
            ),
            (
                "Dado un curso seleccionado, cuando el usuario elige un grupo en el "
                "segundo selector, entonces el listado muestra únicamente las "
                "plantillas asociadas a ese curso y ese grupo."
            ),
            (
                "Dado un curso seleccionado sin grupo, cuando el usuario deja el "
                "segundo selector vacío, entonces el listado muestra las plantillas "
                "generales del curso junto con las de sus grupos."
            ),
            (
                "Dado un grupo sin plantilla propia, cuando el usuario filtra por ese "
                "grupo, entonces el sistema informa que ese grupo usará la plantilla "
                "general del curso."
            ),
            (
                "Dado que existen plantillas creadas, cuando se las muestra el listado, "
                "entonces cada fila indica el nombre de la plantilla, el curso, el "
                "grupo asociado o la etiqueta «General del curso», la cantidad de "
                "elementos sobre la imagen base y la fecha de creación."
            ),
            (
                "Dado un listado con plantillas, cuando el usuario pulsa «Editar» en "
                "una fila, entonces el sistema abre el diagramador en modo de edición "
                "con el fondo y los elementos ya cargados."
            ),
            (
                "Dado un listado con plantillas, cuando el usuario pulsa «Duplicar», "
                "entonces el sistema crea una copia de la plantilla con todos sus "
                "elementos, suggested nombre «<nombre> (copia)» y la misma asociación "
                "de curso y grupo."
            ),
            (
                "Dado un listado con plantillas, cuando el usuario pulsa «Eliminar», "
                "entonces el sistema pide confirmación y solo borra la plantilla tras "
                "la confirmación."
            ),
            (
                "Dado que existen plantillas registradas y la generación está en "
                "proceso, cuando el usuario regresa a la vista, entonces el sistema "
                "muestra el estado del proceso sin perder los filtros aplicados."
            ),
            (
                "Dado que el listado está vacío para los filtros actuales, cuando se "
                "muestra la vista, entonces el sistema ofrece crear una plantilla en "
                "lugar de mostrar una tabla vacía sin salida."
            ),
            (
                "Dado un docente autenticado, cuando intenta abrir la plantilla "
                "perteneciente a un grupo de otro docente, entonces el sistema se lo "
                "impide aunque conozca la dirección de la página."
            ),
        ],
        "no_funcionales": [
            "El listado se muestra en menos de 2 segundos con el volumen actual de "
            "plantillas.",
            "Los mensajes de error y de estado vacío se presentan en español, en "
            "términos del dominio (curso, grupo, plantilla).",
        ],
        "fuera": [
            "El diseño del contenido de la plantilla: eso corresponde al diagramador "
            "(HU-02).",
            "La carga de la imagen base y de las firmas: HU-02 y HU-03.",
        ],
        "dependencias": "Ninguna. Es la base del módulo.",
        "sugerencia_rama": "feat/client/certificados-lista",
    }


def historia_02() -> dict:
    return {
        "id": "HU-02",
        "titulo": "Creación y personalización de plantillas de certificados (diagramador)",
        "rol": "Administrador (ADMIN) o docente (DOCENTE)",
        "descripcion": (
            "Como docente o administrador, quiero subir una imagen base de fondo y "
            "utilizar un diagramador visual para colocar textos dinámicos y firmas, "
            "para generar una plantilla de certificado reutilizable con variables "
            "automáticas."
        ),
        "alcance": [
            "Subida de la imagen base con validación de resolución y formato.",
            "Diagramador visual con clic para añadir bloques de texto y arrastre para "
            "posicionarlos.",
            "Inserción de variables dinámicas predefinidas en el contenido del texto.",
            "Incorporación de firmas desde el repositorio de firmas del sistema.",
            "Guardado de la configuración en coordenadas porcentuales.",
        ],
        "criterios": [
            (
                "Dado el formulario de creación de plantilla, cuando el usuario "
                "selecciona un archivo que no es PNG ni JPG, entonces el sistema "
                "rechaza el archivo indicando el formato aceptado."
            ),
            (
                "Dado un archivo menor a 1200 × 800 px, cuando el usuario intenta "
                "subirlo como imagen base, entonces el sistema lo rechaza indicando "
                "la resolución mínima y la actual."
            ),
            (
                "Dado un archivo mayor a 2500 × 1750 px, cuando el usuario intenta "
                "subirlo como imagen base, entonces el sistema lo rechaza indicando "
                "la resolución máxima y la actual."
            ),
            (
                "Dado un archivo que cumple las condiciones, cuando el usuario "
                "confirma la subida, entonces el sistema la guarda y la muestra como "
                "fondo del lienzo del diagramador."
            ),
            (
                "Dado un fondo cargado en el lienzo, cuando el usuario hace clic sobre "
                "la previsualización, entonces el sistema añade un bloque de texto "
                "centrado exactamente en el punto del clic."
            ),
            (
                "Dado un bloque de texto centrado, cuando se muestra en el lienzo, "
                "entonces crece hacia ambos lados a partir del punto de inserción, "
                "de modo que el texto largo no se salga del lienzo."
            ),
            (
                "Dado un bloque de texto o una firma sobre el lienzo, cuando el usuario "
                "lo arrastra a otra posición, entonces el bloque se mueve en tiempo "
                "real y queda alineado con la posición final."
            ),
            (
                "Dado un bloque de texto seleccionado, cuando el usuario elige una "
                "variable del panel de variables, entonces la variable se inserta en el "
                "texto en la posición del cursor."
            ),
            (
                "Dado un bloque de texto, cuando el usuario ajusta alineación, tamaño de "
                "fuente o color, entonces los cambios se reflejan de inmediato en la "
                "previsualización."
            ),
            (
                "Dado el repositorio de firmas del sistema, cuando el usuario arrastra "
                "una firma al lienzo, entonces la firma se incorpora como elemento y "
                "puede moverse igual que un bloque de texto."
            ),
            (
                "Dado una plantilla con elementos posicionados, cuando el usuario la "
                "guarda y vuelve a abrirla, entonces el fondo y todos los elementos "
                "reaparecen en las mismas posiciones, con el mismo tamaño, "
                "alineación y contenido."
            ),
            (
                "Dado una plantilla sin nombre, cuando el usuario pulsa «Guardar "
                "Plantilla», entonces el sistema no guarda y señala el campo nombre "
                "como obligatorio."
            ),
            (
                "Dado una plantilla asociada a un curso, cuando el usuario guarda, "
                "entonces el sistema la registra con ese curso y, si eligió un grupo, "
                "con ese grupo."
            ),
        ],
        "no_funcionales": [
            "Las posiciones se guardan en porcentajes, de modo que el mismo diseño "
            "funcione aunque la imagen se muestre a distinto tamaño en pantalla.",
            "La validación de resolución se realiza en el navegador para dar respuesta "
            "inmediata y de nuevo en el servidor, que es el que decide.",
            "La previsualización muestra un texto de ejemplo por cada variable para que "
            "el usuario ubique el bloque sin necesidad de generar un certificado.",
        ],
        "fuera": [
            "La administración de las firmas como tales: corresponde a HU-03.",
            "La impresión o descarga de los certificados: corresponde a HU-04.",
        ],
        "dependencias": "Depende de HU-03 (necesita firmas cargadas para mostrarlas).",
        "sugerencia_rama": "feat/client/certificados-editor",
    }


def historia_03() -> dict:
    return {
        "id": "HU-03",
        "titulo": "Gestión y subida de firmas digitalizadas",
        "rol": "Administrador (ADMIN)",
        "descripcion": (
            "Como administrador, quiero subir y gestionar las imágenes de las firmas "
            "de autoridades o docentes, para poder seleccionarlas y arrastrarlas "
            "fácilmente dentro del diagramador de certificados."
        ),
        "alcance": [
            "Apartado dedicado a la gestión de firmas dentro de la configuración de "
            "certificados.",
            "Subida de firmas en PNG o JPG, idealmente con fondo transparente.",
            "Conversión automática a WebP en el servidor para optimizar el "
            "almacenamiento.",
            "Repositorio visual con las firmas disponibles, permitiendo eliminar firmas "
            "y actualizar el nombre de su propietario.",
        ],
        "criterios": [
            (
                "Dado un administrador en el módulo de firmas, cuando abre la vista, "
                "entonces ve el listado en galería de las firmas disponibles con su "
                "nombre de propietario."
            ),
            (
                "Dado un administrador, cuando selecciona un archivo que no es PNG ni "
                "JPG, entonces el sistema rechaza el archivo indicando el formato "
                "aceptado."
            ),
            (
                "Dado un archivo de firma en PNG o JPG, cuando el usuario confirma la "
                "subida, entonces el servidor lo convierte a WebP y lo guarda, y la "
                "galería muestra la firma ya convertida."
            ),
            (
                "Dado una firma con fondo transparente, cuando se convierte a WebP, "
                "entonces la transparencia se conserva."
            ),
            (
                "Dado una firma guardada, cuando el usuario edita el nombre de su "
                "propietario y confirma, entonces el sistema guarda el nuevo nombre y "
                "la galería lo muestra actualizado."
            ),
            (
                "Dado una firma que no es usada por ninguna plantilla, cuando el "
                "usuario solicita eliminarla y confirma, entonces el sistema la borra "
                "del listado y del almacenamiento."
            ),
            (
                "Dado una firma utilizada por al menos una plantilla, cuando el "
                "usuario intenta eliminarla, entonces el sistema no la borra e informa "
                "cuántas plantillas la utilizan y cuáles son."
            ),
            (
                "Dado que el repositorio no tiene firmas, cuando se muestra la vista, "
                "entonces el sistema indica que aún no hay firmas cargadas y ofrece la "
                "opción de subir la primera."
            ),
            (
                "Dado un nombre de propietario vacío, cuando el usuario intenta "
                "guardar, entonces el sistema lo rechaza e indica que el nombre es "
                "obligatorio."
            ),
        ],
        "no_funcionales": [
            "La conversión a WebP reduce el peso almacenado sin pérdida visible de "
            "calidad en la firma impresa.",
            "El tamaño máximo de archivo admitido se informa en la propia vista antes "
            "de la carga.",
        ],
        "fuera": [
            "La validación de identidad de quien firma: el sistema no verifica la "
            "autenticidad de la firma, solo la gestiona como imagen.",
        ],
        "dependencias": "Ninguna, pero se implementa antes de HU-02 para que el "
        "diagramador tenga firmas que mostrar.",
        "sugerencia_rama": "feat/server/certificados-firmas",
    }


def historia_04() -> dict:
    return {
        "id": "HU-04",
        "titulo": "Generación masiva y descarga de certificados por grupo/curso",
        "rol": "Administrador (ADMIN) o docente (DOCENTE) del grupo",
        "descripcion": (
            "Como docente o administrador, quiero generar automáticamente los "
            "certificados para los estudiantes aprobados de un curso o grupo "
            "específico, para descargar todos los documentos listos en un archivo "
            "comprimido sin tener que hacerlos uno por uno."
        ),
        "alcance": [
            "Selección del curso y el grupo de origen, con vinculación automática de "
            "la plantilla correspondiente.",
            "Validación de aprobación contra las notas registradas y el máximo de "
            "faltas del curso.",
            "Generación automática de los certificados en segundo plano.",
            "Descarga de un archivo .zip con los PDF individuales de alta calidad.",
        ],
        "criterios": [
            (
                "Dado un curso y un grupo seleccionados, cuando el sistema busca la "
                "plantilla, entonces usa la plantilla específica del grupo si existe; "
                "si no existe, usa la plantilla general del curso e informa cuál se "
                "está usando."
            ),
            (
                "Dado un curso y un grupo sin ninguna plantilla asociada, cuando el "
                "sistema busca la plantilla, entonces informa que no hay plantilla "
                "disponible y ofrece crear una."
            ),
            (
                "Dado un grupo con estudiantes inscritos, cuando el usuario pide la "
                "vista previa, entonces el sistema muestra cuántos estudiantes hay en "
                "total y cuántos cumplen la condición de aprobación."
            ),
            (
                "Dado un grupo cuyo curso tiene rúbrica y notas registradas, cuando el "
                "sistema filtra a los aprobados, entonces incluye únicamente a quienes "
                "alcanzan la nota mínima del curso y no superan el máximo de faltas."
            ),
            (
                "Dado un grupo sin rúbrica o sin jornadas de asistencia registradas, "
                "cuando el sistema intenta determinar la condición de cada "
                "estudiante, entonces los clasifica como pendientes y explica que "
                "falta información para decidir."
            ),
            (
                "Dado un grupo donde ningún estudiante cumple la condición, cuando el "
                "usuario intenta generar, entonces el sistema no inicia la generación "
                "y explica por qué no hay certificados que emitir."
            ),
            (
                "Dado al menos un estudiante aprobado, cuando el usuario pulsa "
                "«Generar Certificados», entonces el sistema inicia el proceso en "
                "segundo plano y muestra el progreso sin bloquear la interfaz."
            ),
            (
                "Dado un proceso en curso, cuando el usuario observa la pantalla, "
                "entonces ve cuántos certificados se han generado sobre el total "
                "previsto."
            ),
            (
                "Dado un proceso finalizado con éxito, cuando el usuario pulsa "
                "«Descargar», entonces recibe un archivo .zip que contiene un PDF por "
                "estudiante aprobado."
            ),
            (
                "Dado un PDF generado, cuando se abre, entonces muestra la imagen base "
                "de la plantilla a una página de tamaño carta horizontal, con los "
                "textos y las firmas en las posiciones guardadas."
            ),
            (
                "Dado un PDF generado, cuando se revisan sus datos, entonces el nombre "
                "del estudiante, el nombre del curso, el grupo, la nota final y la "
                "fecha de emisión aparecen con los valores de ese estudiante en "
                "particular, nunca con los de otro."
            ),
            (
                "Dado un archivo dentro del .zip, cuando se observa su nombre, entonces "
                "sigue el patrón Certificado_<apellidos y nombres>_<curso>.pdf."
            ),
            (
                "Dado un proceso finalizado, cuando el usuario reintenta la descarga, "
                "entonces puede volver a descargar el mismo archivo."
            ),
            (
                "Dado un docente autenticado, cuando intenta generar para un grupo que "
                "no es suyo, entonces el sistema se lo impide aunque conozca la "
                "dirección de la página."
            ),
        ],
        "no_funcionales": [
            "La generación no bloquea la interfaz: el proceso se realiza en segundo "
            "plano y el usuario puede seguir usando el sistema.",
            "Los certificados se emiten en PDF con texto vectorial, sin pérdida de "
            "nitidez al imprimir en tamaño real.",
            "Un certificado nunca se emite para un estudiante que el reporte de notas "
            "clasifique como pendiente, sin certificado o solo por asistencia: ambas "
            "funciones comparten la misma regla de aprobación.",
        ],
        "fuera": [
            "El envío de los certificados por correo o mensajería.",
            "La firma digital criptográfica que garantice la autenticidad del documento.",
        ],
        "dependencias": "Depende de HU-02 (necesita una plantilla con elementos).",
        "sugerencia_rama": "feat/server/certificados-generacion",
    }


HISTORIAS = [historia_01(), historia_03(), historia_02(), historia_04()]


# ---------------------------------------------------------------------------
# Utilidades de formato
# ---------------------------------------------------------------------------

AZUL = RGBColor(0x1D, 0x4E, 0xD8)
GRIS = RGBColor(0x55, 0x55, 0x55)


def sombrear(celda, color_hex: str) -> None:
    """Aplica un color de fondo a una celda de tabla."""
    tc_pr = celda._tc.get_or_add_tcPr()
    sombreado = OxmlElement("w:shd")
    sombreado.set(qn("w:val"), "clear")
    sombreado.set(qn("w:color"), "auto")
    sombreado.set(qn("w:fill"), color_hex)
    tc_pr.append(sombreado)


def escribir_celda(celda, texto: str, negrita: bool = False, blanco: bool = False) -> None:
    celda.text = ""
    parrafo = celda.paragraphs[0]
    run = parrafo.add_run(texto)
    run.bold = negrita
    run.font.size = Pt(9.5)
    if blanco:
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)


def vineta(documento, texto: str, estilo: str = "List Bullet") -> None:
    parrafo = documento.add_paragraph(style=estilo)
    # Los estilos con viñeta del template por defecto no traen fuente propia: se
    # fija para que el documento se vea igual en cualquier Word.
    for run in parrafo.runs:
        run.font.size = Pt(11)
    if not parrafo.runs:
        run = parrafo.add_run(texto)
        run.font.size = Pt(11)
    else:
        parrafo.runs[0].text = texto


def parrafo(documento, texto: str, size: int = 11, negrita: bool = False, espacio: int = 6):
    p = documento.add_paragraph()
    run = p.add_run(texto)
    run.font.size = Pt(size)
    run.bold = negrita
    p.paragraph_format.space_after = Pt(espacio)
    return p


def titulo(documento, texto: str, nivel: int = 1):
    h = documento.add_heading(texto, level=nivel)
    for run in h.runs:
        run.font.color.rgb = AZUL if nivel == 1 else GRIS
    return h


# ---------------------------------------------------------------------------
# Construccion del documento
# ---------------------------------------------------------------------------


def construir() -> Document:
    documento = Document()

    # Carta horizontal: el documento tiene los anexos de tablas de dos columnas
    # (criterio) que se leen mucho mejor con el ancho de la hoja apaisada.
    seccion = documento.sections[0]
    seccion.orientacion = WD_ORIENT.PORTRAIT

    # ---------------------------------------------------------------- Portada
    parrafo(documento, PROYECTO, size=12, negrita=True, espacio=0)
    parrafo(documento, "Departamento de Informática — Formación Continua", size=10, espacio=24)

    documento.add_heading("Historias de Usuario", level=0)
    parrafo(documento, MODULO, size=14, negrita=True, espacio=24)

    tabla = documento.add_table(rows=0, cols=2)
    tabla.alignment = WD_TABLE_ALIGNMENT.LEFT
    tabla.style = "Table Grid"
    datos = [
        ("Versión del documento", VERSION),
        ("Fecha de emisión", FECHA),
        ("Cantidad de historias", str(len(HISTORIAS))),
        ("Rutas involucradas", "/certificados, /certificados/nuevo, "
                               "/certificados/:id/editar, /certificados/firmas, "
                               "/certificados/generar"),
        ("Roles involucrados", "ADMIN (Administrador), DOCENTE (Docente)"),
        ("Paquetes afectados", "apps/client (React + Vite), apps/server (Express + "
                               "Drizzle ORM), packages/shared"),
        ("Base de datos", "PostgreSQL con Drizzle ORM (apps/server/src/db/schema.ts)"),
    ]
    for etiqueta, valor in datos:
        fila = tabla.add_row()
        escribir_celda(fila.cells[0], etiqueta, negrita=True)
        escribir_celda(fila.cells[1], valor)
        sombrear(fila.cells[0], "EEF2FF")

    # ------------------------------------------------- Decisiones tecnicas
    documento.add_page_break()
    titulo(documento, "1. Decisiones técnicas", 1)
    parrafo(
        documento,
        "Los siguientes estándares rigen todo el módulo y son la base de los "
        "criterios de aceptación de las historias:",
    )

    tabla = documento.add_table(rows=1, cols=2)
    tabla.style = "Table Grid"
    encabezado = tabla.rows[0].cells
    escribir_celda(encabezado[0], "Aspecto", negrita=True, blanco=True)
    escribir_celda(encabezado[1], "Estándar adoptado", negrita=True, blanco=True)
    sombrear(encabezado[0], "1D4ED8")
    sombrear(encabezado[1], "1D4ED8")

    for aspecto, valor in DECISIONES:
        fila = tabla.add_row().cells
        escribir_celda(fila[0], aspecto, negrita=True)
        escribir_celda(fila[1], valor)

    # --------------------------------------------------------- Dependencias
    titulo(documento, "2. Dependencias entre historias", 1)
    parrafo(
        documento,
        "El módulo se implementa en el siguiente orden. HU-03 precede a HU-02 "
        "porque el diagramador arrastra firmas del repositorio, y HU-02 precede a "
        "HU-04 porque generar certificados exige una plantilla con elementos.",
    )

    tabla = documento.add_table(rows=1, cols=3)
    tabla.style = "Table Grid"
    encabezado = tabla.rows[0].cells
    escribir_celda(encabezado[0], "Historia", negrita=True, blanco=True)
    escribir_celda(encabezado[1], "Descripción", negrita=True, blanco=True)
    escribir_celda(encabezado[2], "Depende de", negrita=True, blanco=True)
    for celda in encabezado:
        sombrear(celda, "1D4ED8")

    for hid, descripcion, depende in ORDEN:
        fila = tabla.add_row().cells
        escribir_celda(fila[0], hid, negrita=True)
        escribir_celda(fila[1], descripcion)
        escribir_celda(fila[2], depende)

    # ------------------------------------------------------------- Variables
    titulo(documento, "3. Variables dinámicas del certificado", 1)
    parrafo(
        documento,
        "Son las etiquetas que el usuario puede insertar en un bloque de texto. Cada "
        "una se resuelve con un dato real del sistema:",
    )

    tabla = documento.add_table(rows=1, cols=2)
    tabla.style = "Table Grid"
    encabezado = tabla.rows[0].cells
    escribir_celda(encabezado[0], "Variable", negrita=True, blanco=True)
    escribir_celda(encabezado[1], "Origen del dato", negrita=True, blanco=True)
    for celda in encabezado:
        sombrear(celda, "1D4ED8")

    for variable, origen in VARIABLES:
        fila = tabla.add_row().cells
        escribir_celda(fila[0], variable, negrita=True)
        escribir_celda(fila[1], origen)

    # ------------------------------------------------------------- Historias
    for indice, historia in enumerate(HISTORIAS, start=4):
        documento.add_page_break()
        titulo(documento, f"{indice}. {historia['id']}: {historia['titulo']}", 1)

        tabla = documento.add_table(rows=0, cols=2)
        tabla.style = "Table Grid"
        ficha = [
            ("Historia", historia["id"]),
            ("Rol", historia["rol"]),
            ("Vista", historia.get("vista", "—")),
            ("Rama sugerida", historia["sugerencia_rama"]),
            ("Dependencias", historia["dependencias"]),
        ]
        for etiqueta, valor in ficha:
            fila = tabla.add_row().cells
            escribir_celda(fila[0], etiqueta, negrita=True)
            escribir_celda(fila[1], valor)
            sombrear(fila[0], "EEF2FF")

        parrafo(documento, "", espacio=2)
        parrafo(documento, "Descripción", size=12, negrita=True, espacio=4)
        parrafo(documento, historia["descripcion"])

        parrafo(documento, "Alcance", size=12, negrita=True, espacio=4)
        for punto in historia["alcance"]:
            vineta(documento, punto)

        parrafo(documento, "", espacio=2)
        parrafo(documento, "Criterios de aceptación", size=12, negrita=True, espacio=4)
        for criterio in historia["criterios"]:
            parrafo(documento, f"Dado / Cuando / Entonces: {criterio}", espacio=4)

        parrafo(documento, "", espacio=2)
        parrafo(documento, "Criterios no funcionales", size=12, negrita=True, espacio=4)
        for punto in historia["no_funcionales"]:
            vineta(documento, punto)

        parrafo(documento, "Fuera de alcance", size=12, negrita=True, espacio=4)
        for punto in historia["fuera"]:
            vineta(documento, punto)

    # ------------------------------------------------------- Trazabilidad
    documento.add_page_break()
    titulo(documento, "8. Trazabilidad con el sistema", 1)
    parrafo(
        documento,
        "Correspondencia entre cada historia y los puntos del código existente que "
        "resuelve o reutiliza. Sirve para detectar pronto cualquier historia que "
        "asuma algo que el sistema no tiene.",
    )

    trazabilidad = [
        (
            "HU-01",
            "Ítem de menú en apps/client/src/layout/Sidebar.tsx; ruta /certificados ya "
            "declarada en apps/client/src/App.tsx",
        ),
        (
            "HU-02",
            "Tipos y constantes de plantillas en packages/shared; validación de "
            "dimensiones con sharp en el servidor",
        ),
        (
            "HU-03",
            "Tabla firmas en apps/server/src/db/schema.ts; conversión a WebP con "
            "sharp; almacenamiento en apps/server/uploads/firmas",
        ),
        (
            "HU-04",
            "computeFinalGrade y resolveCertificateCondition (packages/shared); "
            "cursos.notaMin y cursos.maxFaltas (db/schema.ts); loadGradeMap "
            "(grades.service.ts); getStudentAttendanceSummary "
            "(attendance.service.ts); resolveGroupOwnershipFailure "
            "(groupOwnership.ts)",
        ),
    ]

    tabla = documento.add_table(rows=1, cols=2)
    tabla.style = "Table Grid"
    encabezado = tabla.rows[0].cells
    escribir_celda(encabezado[0], "Historia", negrita=True, blanco=True)
    escribir_celda(encabezado[1], "Puntos del sistema que utiliza", negrita=True, blanco=True)
    for celda in encabezado:
        sombrear(celda, "1D4ED8")

    for hid, puntos in trazabilidad:
        fila = tabla.add_row().cells
        escribir_celda(fila[0], hid, negrita=True)
        escribir_celda(fila[1], puntos)

    parrafo(documento, "", espacio=2)
    parrafo(documento, "", espacio=2)
    parrafo(
        documento,
        f"Documento generado automáticamente por scripts/generar_hu_certificados.py "
        f"el {FECHA}.",
        size=9,
        espacio=0,
    )

    return documento


def construir_markdown(historia: dict) -> str:
    """Cuerpo de la issue de GitHub, con el formato de la plantilla del repositorio
    (.github/ISSUE_TEMPLATE/user-story.md)."""
    lineas: list[str] = []

    # Primera linea con el titulo: el script que publica las issues la lee de
    # aqui, de modo que el nombre de la issue y el del documento no divergen.
    lineas.append(f"# {historia['id']}. {historia['titulo']}")
    lineas.append("")
    lineas.append("## Descripción")
    lineas.append("")
    lineas.append(historia["descripcion"])
    lineas.append("")
    lineas.append(f"**Rol:** {historia['rol']}")
    lineas.append("")

    lineas.append("### Alcance")
    lineas.append("")
    for punto in historia["alcance"]:
        lineas.append(f"- {punto}")
    lineas.append("")

    lineas.append("## Criterios de aceptación")
    lineas.append("")
    for criterio in historia["criterios"]:
        lineas.append(f"- [ ] {criterio}")
    lineas.append("")

    lineas.append("## Criterios no funcionales")
    lineas.append("")
    for punto in historia["no_funcionales"]:
        lineas.append(f"- {punto}")
    lineas.append("")

    lineas.append("## Fuera de alcance")
    lineas.append("")
    for punto in historia["fuera"]:
        lineas.append(f"- {punto}")
    lineas.append("")

    lineas.append("## Notas de implementación")
    lineas.append("")
    lineas.append(f"- Decisiones técnicas del módulo: `docs/plan-certificados.md`")
    lineas.append(f"- Historia completa en `docs/HU_Certificados.docx` ({historia['id']})")
    lineas.append(f"- Rama sugerida: `{historia['sugerencia_rama']}`")
    lineas.append("")

    lineas.append("## Dependencias")
    lineas.append("")
    lineas.append(historia["dependencias"])
    lineas.append("")

    return "\n".join(lineas)


def escribir_issues() -> list[str]:
    """Escribe un .md por historia en docs/issues/. Los usa `gh issue create
    --body-file` para que el cuerpo publicado y el documento .docx no se
    desincronicen."""
    carpeta = os.path.join(RAIZ, "docs", "issues")
    os.makedirs(carpeta, exist_ok=True)

    escritos = []
    for historia in HISTORIAS:
        ruta = os.path.join(carpeta, f"{historia['id']}.md")
        with open(ruta, "w", encoding="utf-8") as archivo:
            archivo.write(construir_markdown(historia))
        escritos.append(ruta)

    return escritos


def main() -> None:
    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    documento = construir()
    documento.save(SALIDA)
    print(f"Documento generado: {SALIDA}")
    print(f"Historias de usuario incluidas: {len(HISTORIAS)}")

    for ruta in escribir_issues():
        print(f"  Issue: {ruta}")

    print()
    print("Para publicar en GitHub (requiere `gh auth login`):")
    print("  bash scripts/crear-issues-certificados.sh")


if __name__ == "__main__":
    main()