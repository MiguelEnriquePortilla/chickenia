# Estado vigente — 25 septiembre 2026

Leer [ajustes de actividades, porcentajes y reinicio de Proteínas](HANDOFF_AJUSTES_2026-09-25.md). Sustituye las actividades anteriores afectadas. Reinicio real solicitado por Miguel para hoy: comprobar su recibo antes de cualquier nueva ejecución. No repetirlo al retomar.

# ChickenIA — retomar la siguiente sesión

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

## Inventario de Proteínas — 21 septiembre 2026

Nuevo apartado implementado y probado; Miguel autorizó su publicación. Leer
[acuerdos, funcionamiento y validación](INVENTARIO_PROTEINAS.md).
En este apartado todo se captura en **pollos con decimales**: **Pollo por preparar**
y **Pollos Marinados**, separados para Rostizado y Crujiente, ambos en CEDIS.
«Piezas sueltas» eran pollos marinados y sus cifras ya estaban en pollos completos.
No convertirlas entre ocho ni precargar las cantidades de la foto. Esta decisión
reemplaza la regla histórica de piezas para el nuevo apartado únicamente.

## Entrada vigente — 19 septiembre 2026

**Empezar aquí:** [reporte y pendientes del 19/09](REPORTE_SESION_2026-09-19.md).
Publicado: `e690a4d`. Temas día/noche corregidos, tres botones al final y puntos
de control colapsables. Próxima sesión: nuevos ajustes de Miguel.
No ejecutar los objetivos históricos que aparecen más abajo.

1. [Estado y acuerdos de captura](HANDOFF_CAPTURA_DIARIA.md).
2. [Implementación de los tres informes](INFORMES_DIGITALES.md).
3. [Mapa de documentación y archivos locales](MAPA_DOCUMENTACION.md).

Mensaje para retomar: «Lee el reporte del 19/09. Vamos a ajustar los informes que
ya están publicados en Supervisión y Asistencia, con todo pollo en piezas».

---

## Histórico — instrucciones anteriores, no activas

> **Vigente — 15 de septiembre de 2026:** leer [HANDOFF_FUDIA_REPORTES_2026-09-15.md](HANDOFF_FUDIA_REPORTES_2026-09-15.md) y [REPORTE_FUDIA_2026-09-15.md](REPORTE_FUDIA_2026-09-15.md). Compras y movimientos conversacionales locales probados; bloqueo entre tareas corregido. Próximo objetivo explícito de Miguel: crear una skill de reportes rápidos y precisos de operaciones, movimientos y compras. Solicitud de prueba cerrada y verificada en versión 9, recepción completa y tránsito cero. Base local excluida de Git; OAuth remoto pendiente.

**Prompt vigente:** Lee el handoff del 15 de septiembre y crea la skill de reportes operativos de fudIA, verificando fuentes, fechas, unidades y pendientes en el piloto local. No trasladar pruebas a producción.

## Archivo histórico de instrucciones anteriores

Las indicaciones de «próximo objetivo», «último cierre» y «sin commit» que siguen corresponden a sus fechas; no son el estado actual ni reemplazan el handoff anterior.

> **Último trabajo — 14 de septiembre:** piloto FoodIA local implementado y probado; plugin `foodia-local@personal` instalado. Miguel autorizó commit/push de código y documentación. Primero probar el flujo local, sin incorporar a Lilian todavía. Leer [guía de uso](GUIA_FOODIA.md), [piloto técnico](FOODIA_PILOTO.md) y [reporte de entrega](REPORTE_FOODIA_2026-09-14.md). La conexión remota no está activada hasta configurar OAuth. Los avisos anteriores de esta página son históricos.

> **Trabajo local más reciente:** [Rastro y Apertura de Sucursal separados](HANDOFF_RASTRO_SUCURSAL_2026-09-11.md). Incluye los horarios y la revisión de movimientos antes del pase de salida confirmados por el usuario. Esta implementación todavía no tiene commit/push ni publicación; conservar estos cambios al continuar.

> **Cambio posterior importante:** acceso compartido para todo el equipo durante las pruebas. Leer primero [handoff de acceso de prueba](HANDOFF_2026-09-11_ACCESO_PRUEBA.md). Sustituye las restricciones por persona descritas en los cierres anteriores.

**Último cierre: 11 de septiembre de 2026 — acceso unificado publicado y verificado.**

1. Leer [HANDOFF VIGENTE DE ACCESO](HANDOFF_2026-09-11_ACCESO_PRUEBA.md).
2. Consultar el [REPORTE DEL ÚLTIMO CIERRE](REPORTE_SESION_2026-09-11_ACCESO_UNIFICADO.md).
3. Continuar con el [PLAN DE ÁREAS RESTANTES Y RECETARIO](HANDOFF_2026-09-11_CONTROL_OPERATIVO_RECETARIO.md).
4. Abrir el [DASHBOARD PUBLICADO](https://chickenia.chicanito.app/dashboard.html). Su código está en `dashboard.html` y `js/dashboard.js` dentro de esta carpeta.

## Próximo objetivo acordado

**Incorporar las áreas restantes y EL RECETARIO.**

Partir de las rutinas y recetas reales del negocio. Revisar qué está cargado, qué falta validar y qué materiales existen antes de completar actividades, cantidades o rendimientos.

## Mensaje para iniciar

> Lee 00_INICIAR_AQUI.md y el handoff vigente de ChickenIA. Vamos a continuar con las áreas restantes y el recetario, conservando los registros históricos, las unidades y la operación existente.

Último cambio de aplicación publicado: `41563c3`. Acceso compartido verificado en producción. Este cierre documental se guardó localmente, sin un nuevo commit/push. No confundir los reportes históricos de esta misma fecha con el estado vigente.
