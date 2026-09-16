# Conexión de supervisión con Telegram

## Activación autorizada — 16 septiembre, mediodía

Miguel autorizó iniciar hoy con el reporte actual y trabajar por separado la clasificación de tareas. Después cambió el equipo Development a Pro; confirmado en Vercel. SUPERVISION_NOTIFY_ENABLED se cambió a true en Production. Se publican cuatro crons diarios, con cut explícito: 09:30, 12:00, 17:00 y 19:00 CDMX (15:30, 18:00, 23:00 y 01:00 UTC).

El corte de las 12:00 del día de activación se ejecutará manualmente después del despliegue, ya que su horario transcurrió durante la actualización. Conserva la hora real de captura. La ventana admite hasta 65 minutos de demora, nunca adelanta el corte ni reconstruye datos pasados. La clave única impide duplicarlo si también lo invoca Vercel. Pro programa con precisión de minuto; esta tolerancia no retrasa deliberadamente los mensajes.

Las secciones siguientes conservan el historial de preparación; la decisión de esperar a Pro o mantener avisos desactivados queda sustituida por esta activación.

Estado al 16 de septiembre: conexión publicada y verificada en producción, implementación `2d5f2cd`. Envío real desde el servidor de ChickenIA confirmado por Telegram (message_id 4); prueba local anterior: message_id 3. Cuatro tarjetas de supervisión visibles y desglose de apertura revisado en navegador. El programador sigue desactivado por decisión de Miguel hasta cambiar a Pro.
Grupo creado desde Info Chicanito: **Chicanito · Supervisión diaria**.
ID verificado con envío real del bot: `-5489495348`.
Bot: `@chicanito_supervision_bot` (ChickenIA · Supervisión), agregado como miembro normal.
Lilian (`@ErikaLiliamLopez`) agregada por indicación de Miguel. Nancy y cuenta personal de Miguel pendientes.
Credenciales guardadas en `.env.telegram.local`, excluido de Git; avisos desactivados. No copiar su contenido a documentación ni chats.
Variables de Telegram cargadas como secretos solo de Production en Vercel. Sucursal verificada por API de producción: Jojutla Mercado, ID 1. Plan confirmado: Hobby (prueba Pro expirada). Preparada también CRON_SECRET para el futuro programador nativo de Vercel. Avisos desactivados; no hay crons en vercel.json.
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
6. Cuando Miguel confirme Pro: verificar `CRON_SECRET` ya guardado en Production, ejecutar `node scripts/enable-supervision-cron.js --pro-confirmed`, establecer `SUPERVISION_NOTIFY_ENABLED=true` y publicar vercel.json por Git. Vercel llamará `GET /api/supervision-telegram?action=cron` con `Authorization: Bearer <CRON_SECRET>`.

El programador está preparado pero no activado. Miguel decidió continuar con Hobby y cambiar a Pro después. No usar una pestaña abierta ni una computadora personal como dependencia de los avisos. Las equivalencias UTC actuales son 15:30, 18:00, 23:00 y 01:00 del día siguiente. El POST dispatch sigue disponible para un programador externo; el GET cron solo acepta CRON_SECRET.

## Comportamiento y límites

- Compatible con las 12 funciones de Hobby: la URL de Telegram se reescribe hacia summary, que delega al manejador privado antes de consultar datos. No añade una función serverless. El primer intento con función independiente fue rechazado por el límite; producción se mantuvo en la versión anterior hasta publicar esta corrección.
- Verificación real: acceso anónimo a Telegram devuelve 401; preview autorizado devuelve Jojutla y 9 áreas; summary devuelve los 4 horarios y notifications_enabled=false; POST test devuelve 200 con message_id 4.

- Ventana de envío: cinco minutos a partir del horario. No se reconstruyen cortes pasados con datos actuales. Supervisar fallas del programador: una ejecución fuera de ventana se omite.
- Porcentaje ponderado del bloque y del día; las actividades sin bloque quedan indicadas, no se asignan arbitrariamente. No representa medición automática de inventario o producción.
- Snapshot por ubicación/fecha/corte en `supervision_telegram_deliveries`, con hora real de captura. Cambios posteriores de checklist no modifican el reporte guardado.
- Restricción única y reclamo antes del envío evitan duplicados concurrentes. Una entrega incierta queda `unknown` (o `sending` si el proceso se interrumpe); revisar Telegram antes de cualquier recuperación manual. No hay reenvío automático de resultados inciertos.
- Supervisión muestra cuatro tarjetas desplegables con cumplimiento por área, bloque y día. Si existe un corte guardado muestra el snapshot; si no, identifica expresamente el avance como consulta actual, no histórica. Se actualiza cada minuto mientras la página esté visible. Las actividades todavía sin bloque aparecen indicadas; su clasificación requiere revisar el catálogo.
- Desactivar: `SUPERVISION_NOTIFY_ENABLED=false` y redesplegar; detener también el programador. El endpoint de prueba sigue disponible solo con el secreto.

Fuentes: https://core.telegram.org/bots/tutorial y https://vercel.com/docs/cron-jobs/usage-and-pricing

Pruebas: `node --test test/telegram.test.js`.
