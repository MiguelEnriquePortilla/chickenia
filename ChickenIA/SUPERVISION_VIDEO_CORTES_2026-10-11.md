# Supervisión: cortes y evidencia de video — 11 octubre 2026

Publicado: implementación `9008acd`, push a `main` completado. Estado Vercel success; JS/CSS de Supervisión servidos por chickenia.chicanito.app cotejados con la versión probada normalizando saltos de línea. No se registraron checks reales para verificar en producción: guardado, hora, actor y evaluación comprobados con API y base aisladas.

Miguel autorizó probar esta semana los cortes **10:30, 13:30, 16:30 y 19:30**, hora de Ciudad de México. Permanecen hasta nueva instrucción; no se programa una reversión automática. Evaluación desde el lunes 12 de octubre; el domingo 11 continúa como práctica.

En cada área y cada corte hay dos entregables: checklist y video de evidencia. El video se comparte en el **grupo de Supervisión**; Chicken ChicanIA registra únicamente el check «Video de evidencia entregado en el grupo de Supervisión». Cada marca o desmarca queda en el historial existente con responsable de sesión y hora del servidor. La plataforma registra la declaración de entrega; no inspecciona el grupo ni el contenido del video.

**Sin check de video antes del corte, el reporte de esa área obtiene 0%.** Con evidencia marcada a tiempo, la nota corresponde al porcentaje del checklist. Esta regla alimenta Dashboard, nota diaria y promedios de semana y mes; se mantiene la meta de bono de 85%. No se asigna un porcentaje independiente al video.

Se permite consultar cortes anteriores y registrar una declaración tardía de video durante el mismo día. Su hora real queda visible; no modifica la nota congelada al corte. El checklist conserva la captura únicamente en el horario vigente. Marcar y desmarcar conserva ambas revisiones.

Los catálogos diarios históricos conservan sus horarios y cálculo anteriores. Si el día actual ya existía, solo se actualizan cortes que aún no habían cerrado; no se reabren cortes anteriores ni se recalifican. Los nuevos días incluyen los cuatro horarios y el requisito de video en las diez áreas. Se reutiliza supervision_point_events, con identificador de evidencia por área; sin tablas de archivos ni almacenamiento de video.

Telegram continúa desactivado en Vercel y WhatsApp continúa pendiente según REPORTE_SESION_2026-10-11_WHATSAPP.md. No se reactivaron tareas programadas ni se hicieron capturas de prueba en producción.

Validación: 18 pruebas de lógica/API/PostgreSQL aislado e historial; marca de video con responsable y timestamp no sustituibles por datos enviados desde el cliente; revisión concurrente rechazada; evidencia ausente/tardía devuelve 0%, evidencia a tiempo conserva porcentaje; límites exactos de los cuatro cortes; historiales antiguos preservados. Navegador con API/base aisladas: checklist y video, guardado y recarga, Dashboard e historial, 320/390/1280 y ambos temas. Compilación aprobada.
