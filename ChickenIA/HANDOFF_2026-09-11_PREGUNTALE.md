# Pregúntale a Chicken-IA — primera implementación local

## Implementado

- `preguntale.html`: apartado independiente enlazado desde inicio y navegación común. Cinco consultas rápidas, periodo/fecha y área, conversación, nueva consulta, móvil, tema oscuro y sesión de inventarios.
- `api/chicken-ia.js`: GET únicamente; autentica la cookie en servidor y restringe por IDs `miguel` y `lilian`. Nancy no entra aunque tenga rol manager; Lilian entra con su rol dispatch. No usa la contraseña pública del Dashboard.
- `lib/chicken-query.js`: consultas controladas y respuestas deterministas. No hay modelo de lenguaje conectado ni costes nuevos. Preguntas fuera de las cinco categorías reciben explicación de límites; seguimiento “¿y Cocina?” conserva categoría y fecha.
- Supervisión: catálogo vigente y programación semanal, avance ponderado, críticos sin cumplimiento, falta de captura y comparación con el día anterior. Consulta Jojutla. El enlace a Supervisión conserva la fecha; se añadió lectura del parámetro `date` en esa pantalla.
- Inventarios/compras: estado actual de CEDIS/Sucursal completo, solicitudes por autorizar y pedidos por recibir. Cantidades divididas entre 1000 con unidades originales. No muestra saldos históricos como actuales ni inventa mínimos. Conteo físico separado de saldo, con diferencia pendiente y movimientos posteriores.
- Nancy: reutiliza el reporte de proteínas y sus eventos de hoy; no infiere incumplimiento de la falta de captura.
- Fuentes y fecha por respuesta; último registro separado de hora de consulta. Respuestas construidas con textContent, sin interpretar HTML del usuario o de los registros.

## Verificación y límites

- Pruebas Node de lógica/API/PostgreSQL; prueba adicional `test/chicken-query.test.js` incluida en npm test.
- `python test/chicken_browser.py`: navegador con respuestas simuladas explícitamente, no datos de producción. Requiere servidor estático local en 127.0.0.1:8952; usa Edge. Capturas en test/results/chicken (ignoradas por Git).
- El acceso y las consultas reales requieren las variables existentes de inventarios y DATABASE_URL en el servidor. No se leyeron credenciales de producción ni se consultó la base real en esta sesión.
- No se modificó el acceso del Dashboard legado ni sus endpoints públicos. El nuevo endpoint sí aplica autorización; la app completa requiere una revisión independiente si se pretende cerrar también esas rutas existentes.
- Implementación local, sin commit/push ni despliegue. No publicar por snapshots; conservar el flujo GitHub/Vercel existente y la carpeta ajena Formatos-Internos.
- Antes de anunciar conversación libre con IA: elegir proveedor/modelo y límite de gasto, conectar explicaciones a estas consultas, validar permisos y exactitud. No hay WhatsApp ni escrituras desde chat.
