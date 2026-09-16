# Conexión de supervisión con Telegram

Estado: código local preparado y probado; bot creado y conectado al grupo. Envío real de prueba confirmado desde el código local (respuesta de Telegram: message_id 3) y visible en Telegram Web. Sin despliegue ni programador activado.
Grupo creado desde Info Chicanito: **Chicanito · Supervisión diaria**.
ID verificado con envío real del bot: `-5489495348`.
Bot: `@chicanito_supervision_bot` (ChickenIA · Supervisión), agregado como miembro normal.
Lilian (`@ErikaLiliamLopez`) agregada por indicación de Miguel. Nancy y cuenta personal de Miguel pendientes.
Credenciales guardadas en `.env.telegram.local`, excluido de Git; avisos desactivados. No copiar su contenido a documentación ni chats.
Variables de Telegram cargadas como secretos solo de Production en Vercel. Sucursal verificada por API de producción: Jojutla Mercado, ID 1. Plan confirmado: Hobby (prueba Pro expirada); falta programador externo para los horarios precisos. Avisos permanecen desactivados hasta verificar el despliegue y la programación.
Validación: 9 pruebas aprobadas (telegram, routines y rastro-sucursal); build estático aprobado.

## Activación

1. Crear un bot propio mediante @BotFather y agregarlo al grupo. Basta permiso de enviar mensajes; no necesita leer todas las conversaciones ni ser administrador.
2. Guardar en las variables de servidor de Vercel (nunca en JS público, Git o conversaciones):
   - `TELEGRAM_BOT_TOKEN`: token del bot.
   - `TELEGRAM_CHAT_ID`: ID del grupo; verificarlo si el grupo se convierte en supergrupo.
   - `SUPERVISION_NOTIFY_SECRET`: secreto aleatorio de al menos 32 caracteres.
   - `SUPERVISION_LOCATION_ID`: ID real de la sucursal de la tabla locations.
   - `SUPERVISION_NOTIFY_ENABLED`: mantener `false` hasta terminar la prueba.
3. Desplegar mediante el repositorio existente de ChickenIA.
4. Consultar `GET /api/supervision-telegram?action=preview&cut=apertura` con cabecera `Authorization: Bearer <secreto>`. Los cortes válidos son apertura, comida, precierre y cierre. La vista previa no envía mensajes ni registra un corte.
5. Ejecutar `POST /api/supervision-telegram?action=test` con la misma cabecera. Este paso sí envía un mensaje de prueba al grupo. Confirmar recepción.
6. Cuando Miguel confirme Pro: guardar `CRON_SECRET` como secreto de Production (puede usarse el mismo valor de SUPERVISION_NOTIFY_SECRET), ejecutar `node scripts/enable-supervision-cron.js --pro-confirmed`, establecer `SUPERVISION_NOTIFY_ENABLED=true` y publicar vercel.json por Git. Vercel llamará `GET /api/supervision-telegram?action=cron` con `Authorization: Bearer <CRON_SECRET>`.

El programador está preparado pero no activado. Miguel decidió continuar con Hobby y cambiar a Pro después. No usar una pestaña abierta ni una computadora personal como dependencia de los avisos. Las equivalencias UTC actuales son 15:30, 18:00, 23:00 y 01:00 del día siguiente. El POST dispatch sigue disponible para un programador externo; el GET cron solo acepta CRON_SECRET.

## Comportamiento y límites

- Ventana de envío: cinco minutos a partir del horario. No se reconstruyen cortes pasados con datos actuales. Supervisar fallas del programador: una ejecución fuera de ventana se omite.
- Porcentaje ponderado del bloque y del día; las actividades sin bloque quedan indicadas, no se asignan arbitrariamente. No representa medición automática de inventario o producción.
- Snapshot por ubicación/fecha/corte en `supervision_telegram_deliveries`, con hora real de captura. Cambios posteriores de checklist no modifican el reporte guardado.
- Restricción única y reclamo antes del envío evitan duplicados concurrentes. Una entrega incierta queda `unknown` (o `sending` si el proceso se interrumpe); revisar Telegram antes de cualquier recuperación manual. No hay reenvío automático de resultados inciertos.
- Supervisión muestra cuatro tarjetas desplegables con cumplimiento por área, bloque y día. Si existe un corte guardado muestra el snapshot; si no, identifica expresamente el avance como consulta actual, no histórica. Se actualiza cada minuto mientras la página esté visible. Las actividades todavía sin bloque aparecen indicadas; su clasificación requiere revisar el catálogo.
- Desactivar: `SUPERVISION_NOTIFY_ENABLED=false` y redesplegar; detener también el programador. El endpoint de prueba sigue disponible solo con el secreto.

Fuentes: https://core.telegram.org/bots/tutorial y https://vercel.com/docs/cron-jobs/usage-and-pricing

Pruebas: `node --test test/telegram.test.js`.
