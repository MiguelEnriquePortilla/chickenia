# Rastro, Apertura de Sucursal y Supervisión — implementación local

## Acuerdos confirmados por el usuario

- La entrada de Rastro es a las **6:00 a. m.**
- Rastro y Apertura de Sucursal son rutinas de áreas distintas aunque las realice la misma persona.
- El pelotero es la máquina de monedas que entrega pelotas; colocarlo pertenece a Apertura de Sucursal.
- Supervisión llega a las **7:00 a. m.** para la recepción y apertura; su siguiente control es a las **10:00 a. m.**
- Antes del pase de salida de Rastro se verifican los movimientos registrados de pollo: entradas, salidas y saldo. No se exige un conteo físico diario. Si se realiza, es una verificación diferente.
- “Crema de Rastro” significa **marinado para ROSTI**. No debe confundirse con el marinado de CRUJI que ya existía en el catálogo. Receta y proporciones quedan pendientes para el recetario.

## Cambios realizados

- Nueva área `sucursal_apertura` / **Apertura de Sucursal**, con ocho actividades: cortina, descarga, basura, lonas/mesas, pelotero, trastes, limpieza y resguardo después de recepción.
- Rastro: apertura separada de cuatro actividades; producción y deberes anteriores conservados donde no contradicen el acuerdo nuevo; cierre con marinado ROSTI disponible, registros de movimientos, aviso para revisión y orden del día siguiente.
- Preparación de pollo ROSTI/CRUJI ahora refiere cantidades a la orden del día. Conserva los campos/unidades de captura existentes; no convierte inventarios ni modifica recetas.
- Supervisión: recepción verificada, revisión de apertura en su apartado, control de las 10:00 y revisión previa al pase de salida. Se conservaron sus demás controles anteriores; los horarios no tratados no se reinterpretaron.
- La apertura de Sucursal dentro de Inventarios ahora enlaza a su lista canónica de Supervisión, evitando una segunda captura. Los registros anteriores de apertura permanecen guardados. El checklist histórico de apertura de CEDIS en Inventarios no fue eliminado.
- Nueva área disponible en navegación y filtros de Chicken-IA. Entrenamiento standalone sincronizado para Rastro, Sucursal y Supervisión.

## Migración y datos históricos

`lib/supervision/rastro-sucursal-migration.js` aplica una versión única a las tres áreas, de forma atómica. Si hoy existe una captura en alguna de ellas, las nuevas actividades entran en vigor mañana. Si no, entran hoy. Las actividades anteriores conservan IDs, capturas y vigencia hasta el cambio; no se borran tablas ni registros.

La lista y la verificación de inventario no crean movimientos automáticamente. Los movimientos siguen registrándose en Inventarios. El criterio del pase de salida queda descrito en la lista; no se añadió una operación de autorización digital ni un bloqueo automático entre checks.

El catálogo anterior de Rastro tenía actividades con referencias semanales/quincenales y otros deberes. Se conservaron sus criterios y comportamiento previo; esta entrega no incorpora un programador general de frecuencias para Rastro. Las tareas según necesidad indican documentar cuándo no hubo solicitud. La frase ambigua sobre el corte del chile no se convirtió en una receta nueva.

## Archivos principales

- `lib/supervision/rastro-sucursal-routines.js`: composición del catálogo vigente a partir de los nuevos acuerdos y del catálogo anterior.
- `lib/supervision/rastro-sucursal-migration.js`: migración conjunta; llamada desde `lib/supervision/db.js` después de las migraciones existentes.
- `js/area-navigation.js`: apartado independiente.
- `js/inventory.js`: enlace único para Apertura de Sucursal.
- `lib/chicken-query.js` y `js/chicken-chat.js`: reconocimiento del área nueva.
- `scripts/sync-training-rastro.js`: sincroniza las tres secciones de `entrenamiento.html`.
- `test/rastro-sucursal.test.js`: separación, vigencia conjunta, idempotencia e históricos.
- `test/rastro_browser.py`: navegación y hoja de entrenamiento con catálogos reales y capturas simuladas; capturas visuales en `test/results/rastro/`.

## Estado y continuidad

Validación: 23 pruebas Node aprobadas; recorrido de Inventarios con API/PostgreSQL local aprobado, incluyendo el nuevo enlace de apertura. Se corrigió la inicialización de áreas abiertas en Supervisión para que los enlaces directos por área funcionen también sin preferencias previas guardadas. Build estático y diff revisados.

Implementación local, **sin commit/push ni publicación en esta sesión**. El acceso compartido del piloto permanece. Conservar los documentos locales del cierre anterior y la carpeta ajena `Formatos-Internos/`.

Continuar con las áreas restantes y el recetario usando cantidades, procedimientos y rendimientos confirmados. No inventar fórmulas del marinado ROSTI.
