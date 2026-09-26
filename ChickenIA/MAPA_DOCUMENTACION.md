# Mapa local de ChickenIA

## Último cierre — 26 septiembre 2026

Publicado `52dae97`, confirmado por Miguel. [Reporte vigente](REPORTE_SESION_2026-09-26.md) · [Handoff de Sucursal y Chicanito Móvil](HANDOFF_PROTEINAS_MOVIL_2026-09-26.md). Sucursal conserva Rostizado y Crujiente; Móvil tiene solo Rostizado con registros independientes. Sin tareas automáticas pendientes. Reinicio del 25/09 ya ejecutado: no repetir. Los estados inferiores son históricos.

## Regla vigente: TODO pollo en pollos, 22/09/2026

Leer [unidades de pollo y compatibilidad histórica](UNIDADES_POLLO.md).
Toda captura de pollo admite pollos con decimales, incluidos Producción, mermas,
inventarios, ventas y supervisión. Sustituye las instrucciones anteriores de piezas.
Splash revisado: es el inicio nativo de Android; no se modificó.

## Estado vigente: 22 septiembre 2026

Leer primero [cierre de sesión y acuerdos vigentes](REPORTE_SESION_2026-09-22.md).
Rastro incorpora RECTIFICAR INVENTARIO e histórico de tres días en el dashboard.
Proteínas usa pollos completos con decimales; Producción conserva sus unidades.
La bienvenida con mascota ya fue aprobada; el icono instalado permanece igual.
Las fechas y pendientes anteriores quedan como contexto histórico.

## Documentos vigentes

| Necesidad | Archivo |
|---|---|
| Retomar la sesión | [00_INICIAR_AQUI.md](00_INICIAR_AQUI.md) |
| Lo publicado y continuidad | [REPORTE_SESION_2026-09-26.md](REPORTE_SESION_2026-09-26.md) |
| Dos inventarios de proteínas: Sucursal y Móvil | [HANDOFF_PROTEINAS_MOVIL_2026-09-26.md](HANDOFF_PROTEINAS_MOVIL_2026-09-26.md) |
| Ajustes operativos y antecedente del reinicio real | [HANDOFF_AJUSTES_2026-09-25.md](HANDOFF_AJUSTES_2026-09-25.md) |
| Acuerdos de captura | [HANDOFF_CAPTURA_DIARIA.md](HANDOFF_CAPTURA_DIARIA.md) |
| Funcionamiento de los informes | [INFORMES_DIGITALES.md](INFORMES_DIGITALES.md) |
| Telegram existente | [TELEGRAM_SUPERVISION.md](TELEGRAM_SUPERVISION.md) |
| Piloto local fudIA, frente separado | [GUIA_FOODIA.md](GUIA_FOODIA.md) |

## Carpetas y responsabilidades

- `api/`, `lib/`, `js/`, `css/`: aplicación y lógica; conservar sus rutas de ejecución.
- `test/`: pruebas; `scripts/`: compilación y herramientas de desarrollo.
- `public/`: salida generada del build, ignorada por Git; editar las fuentes.
- `.local/`: bases de prueba y herramientas locales, ignoradas por Git. Los recibos `protein-reset-2026-09-25-*.json` sí documentan una operación real; no confundirlos con fixtures ni publicarlos.
- `plugins/`: fuentes del plugin local; no confundir con los formularios publicados.
- [Neon](../../12-CHICKENIA.NEON/README.md): exportación del esquema y acuerdos de base.
- [PDF y formatos de referencia](../../10-CHATGPT-PROYECTOS/04-FORMATOS-PRODUCCION-Y-CIERRE/README.md).

## Historial

Los `HANDOFF_2026-09-11_*`, `REPORTE_SESION_2026-09-11*`, reportes del 16/09 y 18/09,
`HANDOFF_CHICKENIA.md`, `CAPTURA_FOTO_CIERRE.md` y secciones anteriores de los README
son antecedentes. Se conservan en sus rutas para no romper enlaces. Sus instrucciones
de «siguiente paso» no se reactivan sin petición de Miguel.

Actualizar el reporte vigente y este índice al cerrar una sesión. Evitar copias
«final», «final2» o duplicados del mismo documento. No mover código, bases locales,
archivos `.env`, configuración de Vercel ni formatos ajenos para ordenar documentación.
