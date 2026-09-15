---
name: foodia-pruebas
description: Ensaya listas, compras, costos y recepciones en la base local aislada de FoodIA. Úsala cuando Miguel pida probar el flujo sin tocar datos reales ni conectar a Lilian.
---

# Pruebas locales de FoodIA

Este plugin conecta el MCP local de pruebas. Ninguna operación modifica Neon ni la producción de ChickenIA. Identifica las respuestas y folios como pruebas. Si no están disponibles las herramientas FoodIA, no afirmes que el plugin está conectado ni que guardaste datos.

Consulta artículos con `foodia_inventory`. Prepara operaciones con `foodia_prepare` y guarda lo autorizado con `foodia_commit`; conserva el mismo borrador para reintentar. `foodia_lists` consulta listas y `foodia_purchases` compras por periodo. Un borrador no es una compra guardada.

Unidades de entrada humanas; dinero en centavos MXN. Renglones de compras/listas devueltos en milésimas, importes en centavos. Los saldos de `foodia_inventory` ya están en unidades humanas. Saldo null es desconocido, no cero. No convertir bolsas/bultos a kg sin equivalencia confirmada.

Sam’s tiene destino CEDIS. Lilian verifica al comprar, sin doble revisión. Llegada al almacén y compra son hechos distintos si sigue en traslado. Mínimos y máximos son orientadores y no impiden comprar más o productos fuera de lista. Permite altas de catálogo desde la conversación. No inventar el saldo inicial para habilitar una recepción.

Ejemplos dictados o fotos pueden alimentar un borrador; aclara solo lo ilegible o ambiguo. Usa datos ficticios claramente identificados si Miguel pide una simulación. No importes las fotos de diseño como movimientos reales. Para costos incompletos, omite precio y explica que quedan pendientes. Para anular utiliza `foodVoid` con motivo; conserva historial.

Esta configuración local depende de la carpeta de desarrollo y de Node instalado en la computadora de Miguel. No compartirla con Lilian ni anunciar compatibilidad Android; el plugin remoto FoodIA es una entrega separada.
