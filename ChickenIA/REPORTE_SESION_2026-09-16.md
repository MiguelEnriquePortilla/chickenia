# Cierre de sesión — 16 de septiembre de 2026

## Resultado

Supervisión conectada a Telegram y activa en producción con Vercel Pro. Miguel confirmó la recepción del primer reporte real del mediodía. Última implementación publicada y verificada: `038f3cb`, en `main` de MiguelEnriquePortilla/chickenia.

App: https://chickenia.chicanito.app/supervision.html

## Horarios vigentes

Todos los días, zona America/Mexico_City:

| Hora CDMX | Corte | Propósito | Cron UTC |
|---|---|---|---|
| 09:30 | apertura | Verificar rutina de apertura | 30 15 * * * |
| 12:00 | comida | Revisar preparación para venta de comida | 0 18 * * * |
| 14:00 | produccion | Revisar producción, reposiciones y actividades | 0 20 * * * |
| 17:00 | precierre | Revisar avance antes de iniciar cierres | 0 23 * * * |
| 19:00 | cierre | Revisar cumplimiento de cierre | 0 1 * * * |

El corte de las 14:00 se agregó por petición de Miguel; conserva el de las 17:00. Al terminar esta sesión, el siguiente envío previsto es a las 14:00. Su recepción todavía no se ha verificado.

## Entregado y verificado

- Grupo **Chicanito · Supervisión diaria**, administrado inicialmente desde Info Chicanito; bot `@chicanito_supervision_bot`. Lilian (`@ErikaLiliamLopez`) agregada.
- Variables de servidor configuradas en Production, avisos activos y cinco crons visibles en Vercel.
- Primer corte real de comida enviado a las 12:11:49 CDMX del 16 de septiembre (message_id 5), con hora real de captura. No se presenta como captura puntual de las 12:00.
- Formato mejorado con emojis, barras de avance, porcentajes por bloque y día, pendientes críticos y actividades sin clasificación. Vista previa de producción validada: HTTP 200, corte produccion, horario 14:00 y formato visual presente.
- Tarjetas de cortes en Supervisión: distinguen avance actual y snapshot guardado; actualización cada minuto mientras la página está visible.
- Snapshots inmutables y restricción por ubicación/fecha/corte para evitar duplicados. Entregas inciertas requieren revisión; no hay reenvío automático ciego.
- Seis pruebas de Telegram y rutinas aprobadas para el último cambio. En la implementación previa también se verificaron build, acceso protegido, envío real y navegador.
- Código commiteado y enviado: `818986a` activación; `ba12cf2` formato visual; `038f3cb` corte de las 14:00.

## Decisiones y límites

Enviar con los datos disponibles desde hoy; mejorar asignación y supervisión por separado. Los porcentajes representan cumplimiento del checklist, no cantidades físicas verificadas automáticamente. No inventar datos ni asignar bloques arbitrariamente. Las barras son gráficos de texto; no se adjuntan imágenes.

La ventana de envío acepta hasta 65 minutos de desfase y nunca adelanta un corte. Pro conserva los horarios programados; la tolerancia no introduce una espera deliberada. Los avisos funcionan en el servidor, sin depender de esta computadora ni de una pestaña abierta.

## Para retomar

1. Confirmar recepción y legibilidad del reporte de las 14:00 y de los cortes posteriores, sin reenviar reportes ya entregados.
2. Trabajar con Nancy en clasificación por apertura/operación/cierre, responsables y evidencia de verificación.
3. Definir con datos reales ponderaciones, cantidades, mínimos, máximos y alertas de inventario/producción.
4. Revisar incorporación de Nancy y la cuenta personal de Miguel al grupo; quedan pendientes.
5. Mantener el piloto fudIA y sus pendientes separados; consultar sus documentos del 15 de septiembre cuando se retome ese frente.

## Referencias técnicas

- Guía vigente: [TELEGRAM_SUPERVISION.md](TELEGRAM_SUPERVISION.md).
- Mensaje y cálculo: `lib/supervision/telegram.js`; envío y snapshots: `lib/supervision/telegram-handler.js`.
- Ruta pública `/api/supervision-telegram`, reescrita a `/api/summary?telegram=1`; crons en `vercel.json`, generador `scripts/enable-supervision-cron.js`.
- Credenciales en variables de Production y archivo local `.env.telegram.local`, ignorado por Git. No copiar valores a reportes. El archivo local conserva avisos desactivados; producción está activa.
- Raíz Git: `02-OPERACION/`; Root Directory de Vercel: `ChickenIA`. Publicación por push a `main`.

Sesión cerrada a petición de Miguel. No se desactivan los reportes automáticos.
