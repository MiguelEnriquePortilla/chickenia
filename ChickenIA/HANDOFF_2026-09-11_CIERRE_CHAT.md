# Handoff de cierre — 11 septiembre 2026

> Cierre posterior disponible: [00_INICIAR_AQUI.md](00_INICIAR_AQUI.md). El piloto de consultas ya fue implementado y enviado a main. La siguiente sesión se dedica a las áreas restantes y el recetario; conservar este documento como antecedente.

Este documento es el punto de entrada vigente. Los handoffs anteriores conservan valor histórico; este acuerdo reemplaza propuestas contradictorias sobre la ubicación del chat.

Leer [reporte de sesión](REPORTE_SESION_2026-09-11.md) y [detalle de cocina/compras](HANDOFF_2026-09-11_COCINA_COMPRAS.md).

## Estado confirmado

App publicada en https://chickenia.chicanito.app mediante GitHub main, implementación `c105098` (incluye `4974909`). Despliegue exitoso confirmado. Quedó sin tocar `../Formatos-Internos/`, carpeta ajena no rastreada. No borrar ni agregar por accidente.

La sesión de inventario usa cookie bajo `/api`; usuarios con cookie anterior deben volver a iniciar sesión para usar programación. Los helpers de supervisión están en `lib/supervision/`; actualizar referencias antiguas a `api/lib/` al trabajar. No borrar tablas para actualizar catálogos: usar migraciones versionadas que preservan capturas históricas.

## Próximo objetivo acordado: Pregúntale a Chicken-IA

- Apartado/botón independiente junto a Dashboard, Inventarios y Supervisión; no incrustado exclusivamente en Supervisión.
- Piloto inicial para Miguel y Lilian con datos reales, solo consultas y reportes. Sin capturas, ajustes de saldos, autorizaciones de compra ni escrituras desde el chat.
- Priorizar resumen diario, pendientes críticos, comparación por áreas y seguimiento de verificaciones de Nancy. Inventarios y compras según datos efectivamente disponibles.
- Definir consultas controladas que calculen cifras; el modelo explica resultados sin inventar faltantes. Mostrar fechas, fuente y evidencia navegable.
- Revisar autenticación de estas secciones y autorización real del servidor antes de conectar datos. No asumir que ocultar un botón o compartir el rol manager limita el acceso a Miguel y Lilian.
- Elegir servicio/modelo, configuración segura, límites de consumo y pruebas de exactitud/permisos en la próxima sesión. No hay presupuesto, proveedor ni plazo aprobados.
- WhatsApp, acciones asistidas y comercialización para otros negocios son etapas posteriores. No crear conexión, plugin ni automatización ahora.

## Cómo retomar

1. Leer este handoff y revisar estado Git para conservar cambios ajenos.
2. Confirmar con el usuario que comienza la implementación del piloto y precisar preguntas prioritarias con ejemplos de resultados esperados.
3. Revisar sesiones/permisos, fuentes reales y suficiencia de datos; diseñar el acceso independiente y consultas de solo lectura.
4. Implementar y comprobar que las respuestas coinciden con reportes existentes, respetan permisos y señalan datos faltantes.

Deploy únicamente por commit/push al repositorio existente con root Vercel ChickenIA; no publicar snapshots manuales. No copiar credenciales a documentación.
