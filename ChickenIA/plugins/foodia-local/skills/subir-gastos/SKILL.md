---
name: subir-gastos
description: Recibe gastos por foto, dictado o texto. Las fotos del cierre diario de proteínas y caja se capturan en ChickenIA mediante cierre-caja; las compras por producto siguen en el piloto local de fudIA.
---

# Subir gastos

## Foto del cierre diario: ChickenIA real

Si la imagen es el formato de cierre con proteínas, efectivo y gastos, usa la skill instalada `cierre-caja` en `C:/Users/hp/.codex/skills/cierre-caja/SKILL.md` y su referencia `references/foto-cierre.md`. La foto se registra en el cierre real y alimenta dashboard/reportes; no es una compra para `foodia_prepare` ni se envía a pruebas locales. No deduzcas productos, proveedores o costos unitarios del total de gastos. Fotos compartidas para diseñar el formato no autorizan su captura.

## Compras por producto: piloto local

Opera con el MCP de fudIA en la base local de pruebas. Consulta `foodia_session` al comenzar para verificar conexión y entorno. No afirmes conexión ni guardado si no hay respuesta de las herramientas. No cambia el modelo ni activa el micrófono: recibe el texto o transcripción que entregue la aplicación.

Invita a dictar libremente proveedor, fecha, productos, cantidades, unidades y precios: «Dime qué compraste, cuánto y cuánto costó». Deja que termine el dictado; acepta correcciones durante la conversación. Conserva los datos ya aclarados y pregunta una sola cosa por turno cuando sea necesario. No exijas una foto, una tabla ni un formulario. No vuelvas a preguntar información inequívoca ya recibida.

Busca productos con `foodia_inventory`. Se pueden agregar artículos fuera del catálogo mediante la operación de catálogo de `foodia_prepare`. Mínimos y máximos solo orientan. CEDIS es el destino predeterminado de Sam’s; aprovecha el destino ya indicado para otras compras. Comprar y verificar no exige otra verificación física, pero no equivale a haber llegado al almacén.

Interpreta P como pieza, B como bulto, M como manojo y Ø como cero en las hojas de CEDIS, salvo corrección explícita. «Existencia anterior» es inventario previo; «existencia nueva» son entradas recibidas, nunca saldo total. Lunes a domingo son solicitudes de sucursal, no entregas. Una raya no significa cero. No conviertas bultos o bolsas a kilos sin equivalencia real. No inventes saldos iniciales.

Prepara compras con `foodia_prepare` y la operación `foodPurchase` según su esquema disponible. Las cantidades de entrada son humanas y los importes son centavos MXN. Distingue precio por unidad del total del renglón. Si falta precio, permite costo pendiente y complétalo después mediante `foodCost`; no conviertas un precio desconocido en cero. Registra solo pagos efectivamente informados. Si hay cantidades recibidas pero el saldo inicial es desconocido, conserva la compra pendiente de recepción y aclara el conteo necesario antes de recibir. No vuelvas a registrar una compra existente para completar su precio o recepción.

Resume brevemente proveedor, productos, cantidades, costo conocido y llegada. Si el usuario ya autorizó registrar datos concretos e inequívocos, guarda con `foodia_commit`; si solo pidió preparar, interpretar o probar sin guardar, respeta ese alcance. Resuelve ambigüedades materiales antes de guardar y reutiliza el mismo borrador en reintentos. Devuelve el folio real, total y pendientes, indicando que se guardó en pruebas locales. Usa `foodia_purchases` para comprobar el registro o consultar gastos. Nunca anuncies cambios en producción.

Ejemplo de entrada: «Subir gastos. Es una prueba. Hoy compré en Central 45 kilos de papa a 18 pesos el kilo para CEDIS. Pagué 810 pesos en efectivo; todavía no llega». El importe es $810; no sumes existencias mientras no llegue. Este ejemplo no autoriza por sí mismo ninguna operación.
