---
name: foodia-compras
description: Prepara listas de abastecimiento, registra compras verificadas y recepciones, agrega productos y analiza gastos e inventario de Chicanito mediante las herramientas FoodIA. Úsala para capturas escritas, dictadas o extraídas de tickets.
---

# FoodIA compras

Trabaja con las herramientas FoodIA disponibles. Si no están conectadas, explica que no se ha guardado nada y pide conectar FoodIA; no simules un folio ni uses archivos locales como sustituto de la base compartida.

## Captura conversacional

- Consulta `foodia_session` y busca artículos/unidades con `foodia_inventory`. Una coincidencia ambigua requiere aclaración; evita duplicar artículos ya existentes. La identidad viene del servidor, no del nombre dictado.
- Distingue pedido orientador, compra efectivamente realizada, pago y llegada física. Las columnas “existentes” de una foto no son entradas nuevas. No conviertas una lista pedida en compra sin que el usuario indique que la realizó.
- Para Sam’s, usa CEDIS como destino predeterminado. Lilian compra y verifica en el momento: no exijas segunda revisión. `received` indica llegada física al destino; si el usuario dice que sigue en traslado, será falso. No asumir llegada solo por haber verificado en tienda.
- Mínimos/máximos son referencias. Se permite comprar más, comprar fuera de lista y agregar productos en la conversación. No pidas autorización especial por superar máximos.
- Producto nuevo: prepara y guarda un alta `catalog` con nombre, unidad, área, tipo y precisión apropiada. No inventes una conversión ni un saldo inicial de cero. Si el saldo es desconocido, puedes registrar compra pendiente de recepción; para recibir solicita el conteo físico anterior a esa entrada o resuelve el saldo con el usuario.
- Las entradas de herramientas usan cantidades humanas; `stockQty` va en la unidad de inventario y `purchaseQty` en la unidad de compra. Una caja de cuatro botellas de cinco litros requiere la equivalencia confirmada de 20 litros/caja. La conversión se documenta por compra; aún no hay catálogo persistente de presentaciones.
- Importes de entrada en centavos MXN. `unitPriceCents` corresponde a la unidad de compra. Si hay descuentos/impuestos ya incluidos, usa importe final de renglón y omite precio unitario incompatible; no inventes impuestos. Si falta precio, omítelo: el registro quedará con costo pendiente. Un total global no se reparte arbitrariamente entre productos.
- No inventes cantidades ilegibles de fotos. La foto de Sam’s tenía tapada la cantidad de jugo de naranja. No importar automáticamente ninguna imagen usada como ejemplo del diseño.

## Guardado y correcciones

Usa `foodia_prepare` con la operación adecuada. Devuelve un borrador y su efecto, todavía sin afectar compras/saldos. Presenta un resumen comprensible (productos, cantidades, dinero, destino y si entra al inventario). Con la autorización del usuario usa `foodia_commit` con ese mismo borrador. Una instrucción explícita y completa de registrar puede dar autorización suficiente; respeta confirmaciones de la plataforma y aclara solo ambigüedades reales.

Guarda y reutiliza `draftId` ante reintentos o respuestas inciertas. Si hay conflicto de versión, revisa el estado antes de preparar nuevamente; no inventes IDs ni anuncies éxito por haber creado el borrador. Solo un resultado `saved: true` confirma escritura. Entrega folio y efecto real. Si el usuario ya registró esa compra en la web, consulta y resuelve la duplicidad antes de crear otra.

`foodReceive` completa recepción parcial; `foodCost` completa/corrige costos con motivo; `foodVoid` anula con motivo y revierte existencias cuando el saldo lo permite. No borres históricos ni fuerces una anulación con saldo insuficiente.

## Consultas

`foodia_lists` consulta guías/listas; `foodia_purchases` consulta compras FoodIA por periodo. Sus renglones y los borradores devuelven cantidades en milésimas: divide entre 1000. Sus importes están en centavos: divide entre 100. `foodia_inventory` ya devuelve saldos humanos; no vuelvas a dividirlos. Saldo null significa desconocido.

Explica periodo, fuente y faltantes de precio/pago. El gasto conocido es parcial si hay costos pendientes. Excluye anulaciones del gasto vigente. Comparar precios solo entre unidades/presentaciones equivalentes. No atribuyas gastos antiguos de ChickenIA al reporte FoodIA ni infieras utilidad completa sin datos de ventas y costos suficientes.
