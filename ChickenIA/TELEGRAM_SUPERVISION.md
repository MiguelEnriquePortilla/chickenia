# Supervisión por Telegram — guía vigente

Actualizada al cierre del 16 de septiembre de 2026. Implementación publicada: `038f3cb`. Ver [reporte de sesión](REPORTE_SESION_2026-09-16.md).

## Estado operativo

Vercel Pro confirmado; `SUPERVISION_NOTIFY_ENABLED=true` en Production. Cinco crons activos todos los días, zona America/Mexico_City: **09:30 apertura, 12:00 comida, 14:00 producción y actividades, 17:00 precierre y 19:00 cierre**. El cron de cierre corresponde a 01:00 UTC del día siguiente en relación con la fecha local.

Grupo: **Chicanito · Supervisión diaria**, creado desde Info Chicanito. Bot: `@chicanito_supervision_bot`, miembro con permiso de enviar. Lilian (`@ErikaLiliamLopez`) agregada. Nancy y cuenta personal de Miguel pendientes.

Primer reporte real recibido y confirmado por Miguel: corte comida del 16 de septiembre, captura a las 12:11:49 CDMX, message_id 5. Se ejecutó al terminar la activación porque ya había transcurrido el horario. El siguiente corte previsto al cierre de la sesión es el de las 14:00; todavía no se ha confirmado su recepción.

## Formato y datos

Emojis, barras de texto, avance general y por área, porcentaje del bloque y del día, pendientes críticos y actividades sin bloque. Incluye fecha, hora real de captura y enlace a Supervisión. No adjunta imágenes. Los porcentajes miden cumplimiento ponderado del checklist; no prueban por sí solos existencias ni cantidades producidas.

Supervisión muestra cinco tarjetas desplegables. Un corte guardado utiliza su snapshot inmutable; uno sin captura se identifica como consulta actual. Actualiza cada minuto con la página visible. Las actividades sin clasificación quedan visibles, sin asignarlas arbitrariamente.

## Configuración y rutas

Variables de servidor en Production: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SUPERVISION_NOTIFY_SECRET`, `CRON_SECRET`, `SUPERVISION_LOCATION_ID` y `SUPERVISION_NOTIFY_ENABLED`. Ubicación configurada: Jojutla Mercado, ID 1. Credenciales locales en `.env.telegram.local`, excluido de Git y con avisos desactivados localmente. Nunca copiar valores a documentación o código público.

Ruta pública `/api/supervision-telegram`, reescrita en `vercel.json` hacia `/api/summary?telegram=1`, con manejador privado. Conserva 12 funciones serverless.

- `GET ?action=preview&cut=produccion`: vista previa sin enviar ni guardar corte, con Bearer `SUPERVISION_NOTIFY_SECRET`.
- `POST ?action=test`: envía una prueba real, con el mismo secreto; usar únicamente cuando se requiera una prueba autorizada.
- `POST ?action=dispatch&cut=produccion`: despacho protegido con el mismo secreto, sujeto a ventana y deduplicación.
- `GET ?action=cron&cut=produccion`: ejecución de Vercel, requiere Bearer `CRON_SECRET`.

Cortes válidos: `apertura`, `comida`, `produccion`, `precierre`, `cierre`. El generador `node scripts/enable-supervision-cron.js --pro-confirmed` produce los cinco horarios UTC en `vercel.json`, conservando otros crons. Publicación por GitHub, push a `main`, raíz Git `02-OPERACION/`, Root Directory de Vercel `ChickenIA`.

## Protección y recuperación

Ventana de hasta 65 minutos a partir del corte; nunca se adelanta ni se reconstruye un corte pasado con datos actuales. La tolerancia no retrasa deliberadamente los avisos. El envío depende del servidor, no de una pestaña abierta.

Snapshots en `supervision_telegram_deliveries`, con clave única ubicación/fecha/corte y reclamo antes de enviar. Cambios posteriores en el checklist no alteran el reporte guardado. Un resultado incierto queda `unknown`, o `sending` si se interrumpe el proceso. Revisar Telegram antes de recuperar manualmente: no hay reenvío automático ciego.

Para desactivar avisos: cambiar `SUPERVISION_NOTIFY_ENABLED=false`, redesplegar y detener el programador. El endpoint de prueba protegido sigue disponible. No desactivar al cerrar una sesión de trabajo.

## Verificación realizada

Cinco crons visibles y habilitados en Vercel. Preview de producción: HTTP 200, corte `produccion`, horario `14:00`, emojis y barras presentes. Seis pruebas de Telegram y rutinas aprobadas para el último cambio: `node --test test/telegram.test.js test/routines.test.js`. En entregas previas se comprobaron build, autenticación, navegador, envío real y snapshots inmutables.

## Historial resumido

- `2d5f2cd`: conexión publicada usando la función summary existente tras resolver el límite de funciones de Hobby.
- `818986a`: activación de cuatro cortes; actualización a Pro y primer reporte real.
- `ba12cf2`: emojis y barras de avance.
- `038f3cb`: quinto corte a las 14:00, conservando el de las 17:00.

Las decisiones históricas de esperar a Pro, mantener avisos apagados, usar cuatro cortes o una ventana de cinco minutos quedan sustituidas por esta guía.
