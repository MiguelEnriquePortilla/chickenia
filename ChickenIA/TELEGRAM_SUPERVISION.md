# Supervisión por Telegram — guía vigente

Actualizada el 16 de septiembre de 2026 por la noche. Implementación publicada: `84a3a6c`. Ver [reporte de sesión](REPORTE_SESION_2026-09-16.md).

## Estado operativo

Vercel Pro confirmado; `SUPERVISION_NOTIFY_ENABLED=true` en Production. Cinco crons activos todos los días, zona America/Mexico_City: **09:30 apertura, 12:00 comida, 14:00 producción y actividades, 17:00 precierre y 19:00 cierre**. El cron de cierre corresponde a 01:00 UTC del día siguiente en relación con la fecha local.

Grupo: **Chicanito · Supervisión diaria**, creado desde Info Chicanito. Bot: `@chicanito_supervision_bot`, miembro con permiso de enviar. Lilian (`@ErikaLiliamLopez`) agregada. Nancy y cuenta personal de Miguel pendientes.

Miguel confirmó los reportes de texto del 16 de septiembre, incluido el cierre de las 19:00. El primer reporte previsto con imagen es el 17/09/2026 a las 09:30 CDMX; queda confirmar su recepción y legibilidad.

## Formato y datos

Actualización 18/09/2026: la imagen también incorpora Cierre de Caja y Producción reales de Jojutla, con estado sin captura/borrador/finalizado. Se mantienen los cinco horarios y la deduplicación. Guardar o finalizar no envía inmediatamente. Ver CAPTURA_DIARIA_PRODUCCION.md. Los datos financieros se consultan en la API autenticada, no en summary público.

Un solo envío sendPhoto: PNG, texto y botón «Ver dashboard del día». Imagen con avance diario, nueve áreas, porcentaje diario por área, verificadas/total, interpretación y primera actividad prioritaria pendiente cuando corresponde. Termina con una instrucción al supervisor. Sin porcentajes por bloque ni barras de texto. Los porcentajes miden cumplimiento ponderado del checklist; no prueban existencias ni producción.

Imagen y texto usan el mismo snapshot y muestran la hora real. Si el texto excede 1024 caracteres, la leyenda conserva contexto e instrucción; todo el detalle sigue en la imagen. El botón abre dashboard.html?date=AAAA-MM-DD con acceso autenticado y fecha correcta. El dashboard consulta registros actualizados y puede superar el avance del corte.

Los estados distinguen completas, críticas por verificar, otras pendientes actuales y rutinas posteriores. Se arrastran pendientes anteriores y se respetan horarios explícitos. La migración de `296392d` corrigió las cuatro áreas sin bloque y las tareas tardías de Supervisión conservando IDs, pesos y verificaciones; preview posterior: cero sin clasificar.

Supervisión conserva cinco tarjetas de cortes. Un corte guardado utiliza su snapshot inmutable; uno sin captura se identifica como consulta actual. Actualiza cada minuto con la página visible.

## Configuración y rutas

Variables de servidor en Production: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SUPERVISION_NOTIFY_SECRET`, `CRON_SECRET`, `SUPERVISION_LOCATION_ID` y `SUPERVISION_NOTIFY_ENABLED`. Ubicación configurada: Jojutla Mercado, ID 1. Credenciales locales en `.env.telegram.local`, excluido de Git y con avisos desactivados localmente. Nunca copiar valores a documentación o código público.

Ruta pública `/api/supervision-telegram`, reescrita en `vercel.json` hacia `/api/summary?telegram=1`, con manejador privado. Conserva 12 funciones serverless.

- `GET ?action=preview&cut=produccion`: vista previa sin enviar ni guardar corte, con Bearer `SUPERVISION_NOTIFY_SECRET`.
- `GET ?action=preview&cut=produccion&format=png`: PNG protegido, sin enviar ni guardar corte. Consulta actual; no reconstruye la captura histórica.
- `POST ?action=test`: envía una prueba real, con el mismo secreto; usar únicamente cuando se requiera una prueba autorizada.
- `POST ?action=dispatch&cut=produccion`: despacho protegido con el mismo secreto, sujeto a ventana y deduplicación.
- `GET ?action=cron&cut=produccion`: ejecución de Vercel, requiere Bearer `CRON_SECRET`.

Cortes válidos: `apertura`, `comida`, `produccion`, `precierre`, `cierre`. El generador `node scripts/enable-supervision-cron.js --pro-confirmed` produce los cinco horarios UTC en `vercel.json`, conservando otros crons. Publicación por GitHub, push a `main`, raíz Git `02-OPERACION/`, Root Directory de Vercel `ChickenIA`.

## Protección y recuperación

Ventana de hasta 65 minutos a partir del corte; nunca se adelanta ni se reconstruye un corte pasado con datos actuales. La tolerancia no retrasa deliberadamente los avisos. El envío depende del servidor, no de una pestaña abierta.

Snapshots en `supervision_telegram_deliveries`, con clave única ubicación/fecha/corte y reclamo antes de enviar. Cambios posteriores en el checklist no alteran el reporte guardado. Un resultado incierto queda `unknown`, o `sending` si se interrumpe el proceso. Revisar Telegram antes de recuperar manualmente: no hay reenvío automático ciego.

Para desactivar avisos: cambiar `SUPERVISION_NOTIFY_ENABLED=false`, redesplegar y detener el programador. El endpoint de prueba protegido sigue disponible. No desactivar al cerrar una sesión de trabajo.

## Verificación realizada

11 pruebas de reportes aprobadas (`npm run test:telegram`) y build correcto. Producción: JSON y PNG HTTP 200. Imagen inspeccionada: captura 20:39:56 CDMX, nueve áreas al 100%, 131877 bytes. Es vista previa, no envío real; queda confirmar recepción de la primera foto automática mañana.

Renderizador: lib/supervision/report-image.js con Sharp y NotoSans.ttf (OFL incluida). Vercel incluye explícitamente la fuente en summary. Interpretación: report-guidance.js. Envío: telegram.js y telegram-handler.js. Se renderiza antes del reclamo de entrega; después solo el ganador envía una foto. Un resultado incierto no provoca reintento automático ni segundo mensaje de respaldo. El endpoint de prueba sigue enviando solo texto de conexión.

## Historial resumido

- `2d5f2cd`: conexión publicada usando la función summary existente tras resolver el límite de funciones de Hobby.
- `818986a`: activación de cuatro cortes; actualización a Pro y primer reporte real.
- `ba12cf2`: emojis y barras de avance.
- `038f3cb`: quinto corte a las 14:00, conservando el de las 17:00.
- `296392d`: clasificación y resumen breve; Miguel lo consideró demasiado escueto.
- `84a3a6c`: imagen del corte, detalle por área, instrucción y botón al dashboard. Formato vigente aprobado por Miguel.

Las decisiones históricas de esperar a Pro, mantener avisos apagados, usar cuatro cortes o una ventana de cinco minutos quedan sustituidas por esta guía.
