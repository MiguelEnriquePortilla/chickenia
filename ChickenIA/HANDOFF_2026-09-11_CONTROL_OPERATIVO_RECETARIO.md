# Handoff vigente — áreas restantes y recetario

## Punto de entrada

Este es el cierre más reciente de la sesión del 11 de septiembre de 2026. Leer primero `00_INICIAR_AQUI.md` y el [reporte asociado](REPORTE_SESION_2026-09-11_CHICKENIA_CONTROL_OPERATIVO.md). Los handoffs anteriores conservan antecedentes, pero sus pendientes de implementación/push de Chicken-IA ya fueron superados donde contradigan este documento.

## Objetivo explícito del usuario

**En la próxima sesión incluir las áreas restantes y EL RECETARIO.** No se ha definido todavía el alcance exacto de cada área ni se han aprobado recetas, proporciones, rendimientos o reglas nuevas de inventario.

## Estado que se debe conservar

- Inicio con iconos y nombre **Control Operativo**. Mantener `?panel=nancy` como enlace compatible; los nombres personales de registros y verificaciones no se cambian.
- Pregúntale a Chicken-IA ya implementado y enviado a main. Piloto guiado de solo lectura para Miguel y Lilian; no LLM, WhatsApp ni acciones de escritura.
- Último commit enviado: `23c45fb`, después de `7ea0e3e`. Push confirmado; despliegue y consultas reales de producción pendientes de verificación.
- No confundir la autorización del nuevo endpoint con la seguridad global de la app: Dashboard legado mantiene acceso comprobado en cliente y endpoints de supervisión existentes no se cerraron en esta sesión.
- Rosticero y Cocina ya tienen trabajo de rutinas por apertura, operación y cierre. Cocina: 31 actividades diarias y 7 semanales; las semanales cuentan solo si están programadas. Revisar los catálogos actuales para determinar el estado de las demás áreas, sin asumir que todas están vacías.
- Sidebar existente: Rastro, Almacén, Cocina, Rosticero, Freidoras, Caja, Ventas/Barras, Lavado de trastes y Supervisión. Moto permanece oculta según acuerdos anteriores. Almacén no tenía catálogo de supervisión en el cierre previo.

## Secuencia propuesta para continuar

1. Revisar estado Git y, mediante los mecanismos existentes, comprobar el último despliegue antes de atribuir problemas a los cambios nuevos.
2. Localizar los documentos operativos y recetas que el usuario ya tenga; revisar el catálogo real por área. Presentar una lista breve de áreas completas, parciales y pendientes de validar.
3. Incorporar las áreas restantes con actividades reales en Apertura / Operación / Cierre. Definir responsable, frecuencia, evidencia y cantidades solo cuando exista información validada. No copiar metas de una actividad a otra por semejanza.
4. Preparar el apartado de recetario con recetas reales. Como estructura propuesta: nombre, área, ingredientes y unidades, cantidad base, rendimiento/porciones, procedimiento, equipo y versión. Conservación, tiempos y temperaturas deben proceder de fuentes validadas, no de suposiciones.
5. Aclarar con el usuario si el recetario será inicialmente de consulta o si debe relacionarse también con producción. No descontar inventario al abrir una receta o marcar una actividad: cualquier transformación automática necesita alcance y reglas explícitos.
6. Comprobar navegación móvil, lectura del recetario, captura de actividades y preservación de históricos. Si se incorporan nuevas fuentes a Chicken-IA, mantener autorización de servidor y enlaces verificables.

## Archivos útiles

- `lib/supervision/db.js`: esquema y catálogo base.
- `lib/supervision/rosticero-routines.js`, `lib/supervision/cocina-routines.js`: rutinas validadas.
- `lib/supervision/routine-migration.js`: mecanismo de migración; revisar archivos existentes de migración al extenderlo.
- `entrenamiento.html`: hoja standalone; mantener sincronización cuando aplique.
- `lib/inventory-domain.js`, `lib/kitchen-items.js`: unidades, catálogo y transformaciones actuales.
- `js/inventory.js`: Control Operativo y sus vistas existentes.
- `api/chicken-ia.js`, `lib/chicken-query.js`, `preguntale.html`, `js/chicken-chat.js`: piloto de preguntas.
- `js/area-navigation.js`, `css/area-navigation.css`: navegación compartida.
- `HANDOFF_2026-09-11_COCINA_COMPRAS.md`, `HANDOFF_2026-09-11_RUTINAS_NAVEGACION.md`: reglas operativas previas.

## Reglas de continuidad

- Preservar capturas históricas con migraciones versionadas; no borrar tablas ni reinterpretar unidades o saldos.
- Las preparaciones nuevas usan kg según catálogo; otras unidades existentes siguen vigentes. Pollo residual ya forma parte del saldo y no se suma de nuevo.
- No inventar mínimos/máximos, recetas, rendimientos, parámetros de conservación ni cantidades de producción.
- La raíz Git es `02-OPERACION/`; la app y raíz Vercel están en `ChickenIA/`.
- Publicar por commit/push al repositorio existente, nunca por snapshots manuales. No incluir secretos, bases locales, capturas de pruebas ni `Formatos-Internos/`.
- En este entorno Node se encontró en `C:/Users/hp/AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe`; verificar disponibilidad si no está en PATH. Python/Playwright con Edge funcionaron.
- Validación habitual: `npm test`, `node scripts/build-static.js`, `git diff --check`; recorridos de navegador según módulos modificados. El test del chat usa respuestas simuladas y no sustituye validación real en producción.

## Situación de este cierre documental

Reporte, handoff y acceso rápido guardados en la carpeta ChickenIA. Estos documentos nuevos no se han enviado a GitHub en este cierre. El servidor temporal de la vista previa se detuvo; las capturas quedan en `test/results/chicken/`.
