---
name: produccion-diaria
description: Captura producción de Cocina, Freidoras y Rosticero por preguntas o ficha autenticada de ChickenIA. Mantiene preparar, hecho y sobrantes separados; distingue operación real y pruebas locales.
---

# Producción diaria

## Hoja fotografiada de proteínas y caja

La foto CD-01 usa el flujo de cierre-caja y su [guía de foto](../cierre-caja/references/foto-cierre.md). Incluye llegada cruda, tres producciones, sobrantes y mermas. No obliga a registrar cocina ni planes de producción ausentes; no genera movimientos de inventario. Conserva captura previa y verifica cada guardado.

## Operación real (predeterminada)

Abre https://chickenia.chicanito.app/captura.html?mode=production con date=fecha CDMX solicitada. Usa el acceso normal de ChickenIA; no fabriques credenciales ni cookies. Retoma el borrador visible, acepta dictado por área y completa el formulario con los datos autorizados. Verifica guardado; finaliza solo por instrucción del usuario. Dashboard y cortes de Telegram consultan estos registros; no se suman al inventario ni se convierten en compras.

Las herramientas foodia_production_get/save y la CLI siguen siendo locales. No sirven para registrar producción real. Si no hay sesión, abre el acceso para el usuario; no sustituir con prueba local. Conserva unidades y cantidades de cada tanda; el cierre finalizado queda de solo lectura.

## Piloto local (solo si se piden pruebas)

Recupera primero la fecha CDMX con `foodia_production_get`, o la CLI en [references/captura.md](references/captura.md). Predetermina hoy y Jojutla Mercado. Si ya hay borrador, retómalo, no empieces uno vacío.

Pregunta «¿Empezamos con Cocina, Freidoras o Rosticero?». En esa área acepta una lista dictada completa de lo que quedó, lo que se ordena y lo hecho. Pide solamente la unidad o cantidad que falte. Muestra una tabla breve con producto, unidad, preparar y hecho; la ficha visual permite cambiar entre primera tanda, segunda tanda de las 14:00 y cierre.

Guarda cada respuesta inequívoca en el borrador con `foodia_production_save`, revisión vigente y data completo. null significa pendiente, cero es una afirmación explícita. No conviertas todos los productos omitidos a cero. `active:false` significa que el usuario excluyó ese producto del día, no que se agotó. No excluyas silenciosamente productos para finalizar.

Usa las unidades recuperadas. Cuando no estén definidas, pregunta una sola vez por producto antes de interpretar cantidades. Cruji: crudo en pollos, producción y cocido en piezas; 8 piezas=1 pollo solo para Cruji. Rosti en pollos, costilla en kg. No conviertas otras presentaciones sin equivalencia confirmada. Datos con diferente unidad no se suman. Cambiar unidad después de capturar requiere aclarar las cantidades; nunca reinterpretarlas silenciosamente.

«Preparar» es la orden; «hecho» es producción registrada. Crudo y cocido son campos distintos. Sobrante es una observación de cierre, no una venta, merma ni movimiento automático. No deduzcas ventas restando sobrantes.

Leche, aceite y crema LALA se capturan como orden de compra orientadora del día; no son compras ni recepciones. Comida de empleados tiene su propio campo. Para pedir o recibir CEDIS, usa el flujo de movimientos existente con sus folios; no crees un envío a partir de una orden de producción.

Finaliza solo por instrucción del usuario, después de revisar faltantes del servidor. Ante conflicto vuelve a consultar; conserva correcciones y no sobreescribas otra versión. No inventes responsables ni comprobantes. Una captura finalizada no puede editarse en este primer piloto.

Todo permanece local y de prueba. No está conectado todavía a los reportes remotos ni a Telegram; no anuncies cambios de existencias reales.
