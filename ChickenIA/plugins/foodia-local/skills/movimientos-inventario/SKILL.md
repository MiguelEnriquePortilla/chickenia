---
name: movimientos-inventario
description: Captura y consulta movimientos diarios de inventario de CEDIS a sucursal por dictado, texto o foto. Solicitud, envío, recepción parcial y devolución, sin costos. Usar cuando Miguel pida movimientos de inventario, pedido diario para producción o recepción de sucursal.
---

# Movimientos de inventario

Usa el MCP local de fudIA, entorno de pruebas. Comprueba `foodia_session`; si faltan herramientas, no anuncies registros. Esta skill acepta dictado transcrito por la aplicación; no cambia modelos ni activa el micrófono. No requiere fotos ni tablas para capturar.

Identifica si se solicita, envía o recibe. «Pidieron» nunca autoriza marcar enviado; «enviamos» nunca confirma recepción. Sigue el esquema de ChickenIA mediante `foodia_prepare` y `foodia_commit`:

- `request`: `due` (YYYY-MM-DD), `lines` ({item, qty}), `note`. Solicita para hoy o futuro; no modifica saldos.
- `send`: `request`, `lines`, `note`. Descuenta CEDIS y deja en tránsito. El folio guardado identifica el envío.
- `receive`: `request`, `shipment`, `lines`, `note`. Solo las cantidades realmente recibidas pasan a sucursal. Una diferencia parcial necesita motivo.
- `transitReturn`: `request`, `shipment`, `lines`, motivo en `note`. Devuelve a CEDIS mercancía pendiente en tránsito.
- `closeRequest`: `request`, motivo en `note`. Cierra tras resolver tránsito; no inventes recepción para cerrar.

Consulta `foodia_movements` por fechas para encontrar folios y pendientes antes de crear otro registro. Las fechas filtran la fecha solicitada, no la fecha física de cada envío. Consulta un periodo mayor si buscas un pedido antiguo; si hay varias coincidencias, pregunta cuál. La consulta conserva abiertas y las últimas 50 cerradas, no todo el histórico. Las respuestas de movements e inventory usan cantidades humanas; los borradores/eventos internos usan milésimas. No vuelvas a dividir cantidades ya normalizadas.

Busca artículos y unidades con `foodia_inventory`. Prioriza kg cuando el producto ya se controle así; admite decimales según precisión del catálogo. No cambies unidades históricas ni conviertas bultos, bolsas, piezas o manojos a kilos sin equivalencia confirmada para ese producto. Si el usuario desea adoptar kg y el catálogo sigue en bultos, explica la diferencia y acuerda el artículo/unidad antes de registrar; no dupliques artículos automáticamente. No inventes existencias iniciales para superar una validación.

Pide solo el dato material que falte, una pregunta por turno. Acepta listas completas dictadas y correcciones, sin interrogar cada renglón ya claro. Conserva correcciones previas. Si el usuario autoriza guardar una operación clara, prepara y confirma con el mismo draftId; devuelve folio, efecto y pendientes. Si pide revisar antes de guardar, muestra un resumen y espera. Ante conflicto, consulta estado antes de preparar otro borrador; no dupliques movimientos.

## Formato de la hoja de CEDIS

Al transcribir: producto; existencia anterior; entradas recibidas (la antigua «existencia nueva»); solicitado lunes a domingo; saldo final; entregado por y recibido por. P=pieza, B=bulto, M=manojo y Ø=cero salvo corrección. Una raya no es cero. Las columnas diarias representan solicitudes, no salidas realizadas. No importes una foto como movimientos sin autorización ni supongas que una foto anterior corresponde a hoy.

Para el resumen semanal agrupa las solicitudes por `due`, producto y unidad, en columnas L, Ma, Mi, J, V, S, D. Usa solo cantidades solicitadas en esas columnas; muestra estado cerrado cuando aplique (cerrar no demuestra entrega). Presenta enviado, recibido y pendiente en un resumen separado por folio. Si falta existencia anterior o entradas del periodo, indica «sin dato»; el saldo actual consultado no equivale al saldo final histórico de la hoja. Usa actores y fechas registrados como trazabilidad, sin inventar firmas físicas. El backend actual etiqueta el transportista como Eliseo; no lo presentes como una firma confirmada ni atribuyas otro transportista sin soporte.

Este flujo no solicita precios ni pagos. Las compras que llegan de un proveedor corresponden a `subir-gastos`; no las registres como envío de CEDIS a sucursal. Las cantidades iniciales solo pueden capturarse con `initial` si el usuario confirma el conteo y el dominio lo permite; una solicitud no es un conteo. Solicitudes históricas anteriores a hoy requieren soporte adicional: no cambies su fecha para hacerlas pasar como actuales.

Ejemplo: «Para mañana pide quince kilos de papa a CEDIS». Busca el artículo por kg y registra únicamente la solicitud autorizada. Después «enviamos diez» y «recibimos ocho, faltan dos» son movimientos separados contra sus folios. Todo permanece en pruebas locales, sin costos ni efectos en Neon.
