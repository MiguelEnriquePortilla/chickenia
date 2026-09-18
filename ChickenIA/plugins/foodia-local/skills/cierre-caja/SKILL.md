---
name: cierre-caja
description: Captura el cierre diario y sus gastos en ChickenIA desde una foto de WhatsApp de la hoja de proteínas y caja, dictado o formulario. Usar cuando se arrastra la foto para subir el cierre o los gastos. Distingue operación real de pruebas locales.
---

# Cierre de Caja

## Foto de WhatsApp: cierre, proteínas y gastos

Si el usuario adjunta la hoja de cierre para capturarla, sigue [references/foto-cierre.md](references/foto-cierre.md). Registra caja y proteínas como borradores reales de la misma fecha; no uses el piloto de compras. Una foto compartida solo como referencia de diseño no se registra.

## Operación real (predeterminada)

Abre https://chickenia.chicanito.app/captura.html?mode=close con la fecha CDMX solicitada en el parámetro date. Usa la sesión normal de ChickenIA; no fabriques cookies ni pidas credenciales por chat. Recupera el borrador visible antes de dictar o editar. Puedes guiar una pregunta por vez y llenar los campos del formulario con los datos autorizados. Guarda borrador y verifica el estado «Guardado»; finaliza solo si el usuario lo pide. El dashboard y los cortes programados de Telegram consultan estos registros. Finalizar no envía inmediatamente otro mensaje.

Las herramientas foodia_cash_get/save y la CLI siguen siendo SOLO LOCALES. No las uses para una captura real. Si no puedes acceder a la sesión real, abre la ficha para que el usuario entre; no cambies silenciosamente a pruebas. Un cierre finalizado queda de solo lectura; no inventes una segunda fecha para corregirlo.

## Piloto local (solo si se piden pruebas)

Al invocarse, recupera la captura de la fecha CDMX antes de preguntar. Predeterminados: hoy, Jojutla Mercado, corte diario consolidado. No cambies la fecha para acomodar datos de otro día. Un solo documento por fecha en este piloto; no reemplazarlo para capturar otro turno. El primer turno es una entrega dentro del cierre diario.

Usa `foodia_cash_get` y `foodia_cash_save` cuando estén disponibles y verifica `local-test`. Alternativa funcional: la CLI descrita en [references/captura.md](references/captura.md). La ficha y la conversación comparten la misma base. No anuncies guardado sin respuesta satisfactoria.

Abre con una pregunta breve: «Abrimos el cierre de hoy en pruebas. ¿Quién prepara el corte y cuánto había de caja chica?». Si hay borrador, resume lo conocido y pregunta el siguiente faltante. Acepta varios datos juntos, correcciones y dictado; no obligues a responder renglón por renglón. Después de guardar, muestra una tabla corta de debe quedar, contado, diferencia y entrega pendiente. Ofrece ficha visual cuando ayude.

Recorrido flexible: efectivo; conteo de billetes/monedas; entrega y receptor; ventas por medio de pago; comprobantes e incidencias. Pide detalle solo cuando hubo movimientos. Una respuesta «no hubo gastos» vale cero; un espacio, silencio o dato ilegible permanece null. Si se dicta solo el total contado, consérvalo en la conversación y pide desglose antes de guardarlo: el esquema actual calcula el total desde denominaciones, no inventes billetes.

Los importes se envían en centavos MXN enteros. Cantidades de billetes y monedas son enteros. Nunca calcules totales con el modelo como sustituto del cálculo del servicio. No restes dos veces la entrega del primer turno. Cancelar sin cobrar no equivale a devolver efectivo. Gastos del cierre describen caja, no crean automáticamente compras ni pagos externos. Detalles de movimientos son evidencia de los totales capturados, no un segundo descuento.

Guarda borradores con `finalize:false`, datos recuperados completos y revisión vigente. Ante conflicto o respuesta incierta, vuelve a consultar y compara; no sobreescribas una versión ajena ni crees otro cierre. Finaliza solo si el usuario lo pide y el servidor acepta los datos. Si hay diferencias explicadas, di «finalizado con diferencias», nunca «cuadrado». Finalizado no equivale a revisado ni firmado por Supervisión. No inventes identidades, firmas o comprobantes.

La primera versión funciona en esta computadora. No está conectada al dashboard remoto ni al Telegram financiero. Indícalo al iniciar sin repetirlo en cada pregunta. Producción tiene su propia skill.
