# Handoff vigente — próxima sesión: reportes rápidos y precisos

## Pedido de Miguel

La siguiente sesión debe crear una skill que genere un reporte rápido y preciso de operaciones, movimientos de inventario y compras. No implementada en este cierre. Mantener experiencia conversacional/voz y preguntas mínimas. Miguel prefiere instrucciones de uso de un paso a la vez.

Leer primero REPORTE_FUDIA_2026-09-15.md, GUIA_FOODIA.md y FOODIA_PILOTO.md. Las referencias del 11 y 14 de septiembre son contexto histórico; no reemplazan este estado.

## Punto de partida comprobado

Plugin fudIA local - pruebas instalado, ID foodia-local@personal, versión 0.1.0+codex.20260915184655. Tres skills: fudia-pruebas, subir-gastos, movimientos-inventario. Siete herramientas MCP. Código en main hasta 3ff71e2 antes del presente cierre documental.

Base PGlite aislada en .local/foodia-pilot/postgres. No copiar datos ficticios a Neon. La conexión remota publicada exige OAuth; no prometer acceso ChatGPT/Android ni incorporación de Lilian. No hace falta Drive para seguir; la base está excluida de Git y aún no tiene respaldo adicional configurado.

La conexión ya permite varias tareas por turnos. Si vuelve a fallar, distinguir descubrimiento inexistente, error de arranque, bloqueo de base y ausencia de artículos. No pedir reiteradamente cambiar el prompt. Revisar registros MCP y owner.lock. No quitar bloqueo de un dueño vivo; comprobar identidad antes de detener un proceso antiguo. No borrar datos.

## Datos de prueba útiles

Papa Alfa kg: a67f3a8a-ec8f-4c0b-a13a-8563851b8e84. Zanahoria entera kg: d9d2c1c2-2d53-4c65-ba3a-06563a736287. Saldos confirmados: CEDIS 5 y 3 kg; sucursal 15 y 7 kg. Tránsito cero.

Solicitud eb8c8905-ae8b-45c4-8077-d5814cc923b4 del 15/09; envío 6c2687de-6717-48b5-afbc-6cd289ddf7cb. Recepción completa en dos pasos y cierre registrado por Miguel, folio 5a8bef5f-c146-470a-bf98-4e0a85c39990. **Estado closed verificado directamente en versión 9**, tránsito cero. No volver a recibir ni cerrar este ejemplo. Consultar nuevamente si se retoma.

## Diseño sugerido para la nueva skill

Nombre propuesto, por acordar al implementar: reporte-operativo. Salida breve: periodo/entorno/fuentes y hora consultada; compras y costo conocido con pendientes; cantidades solicitadas/enviadas/recibidas/en tránsito por unidad; existencias conocidas y desconocidas; diferencias y acciones pendientes. Sin mezclar unidades ni contar transferencias como gastos. No inferir consumo por haber recibido mercancía.

La petición incluye «operaciones»: revisar si necesita supervisión/asistencia/producción además del inventario y exponer consultas autorizadas si faltan. El MCP actual no cubre automáticamente todas esas fuentes. Preguntar solo el alcance que no se pueda inferir; avanzar con las fuentes existentes sin inventar cobertura.

Para precisión:

- Separar fecha de compra, fecha solicitada y fecha real de envío/recepción. Hoy debe resolverse en America/Mexico_City.
- foodia_movements filtra por due y consulta inv_state.requests (abiertas + 50 cerradas). No sirve por sí sola como histórico completo de movimientos diarios. Para reportes por fecha física, evaluar una consulta de inv_events con rangos y trazabilidad.
- foodia_purchases incluye solo documentos FoodIA, distingue anuladas, costo pendiente y pagos desconocidos. Importes en centavos; cantidades de documentos en milésimas. inventory y movements ya devuelven cantidades humanas.
- Saldos null son desconocidos. No convertirlos en cero ni construir saldo inicial/final histórico desde el saldo actual. La hoja diaria representa solicitudes, no prueba entregas.
- No sumar porciones, kg y piezas entre sí; equivalencias por producto confirmadas. La zanahoria en palitos no es zanahoria entera.
- Reportes de solo lectura, con folios y filtros verificables. Si faltan datos, explicitar alcance incompleto en vez de anunciar «todo correcto».

Pruebas esperadas: recepción parcial en dos fechas, tránsito pendiente, solicitudes cerradas sin entrega total, costos pendientes y anulaciones, saldos desconocidos, unidades distintas, límites de periodo y reintentos sin duplicar. Comparar resultados con eventos/documentos, no solo con el texto de la skill.

## Archivos para implementar

lib/food-mcp.js: herramientas y esquemas. lib/food-service.js: consultas y borradores. lib/inventory-domain.js: reglas existentes. lib/inventory-store.js: estado/eventos y transacciones. scripts/foodia-local.js: ejecutor compartido por turnos. plugins/foodia-local/skills: skills instalables. test/foodia-local.test.js y test/foodia-mcp.test.js: recorridos reales MCP.

Actualizar fuente del plugin, cachebuster e instalación según plugin-creator al agregar la skill. Conservar el nombre visible fudIA y el ID técnico existente. Documentar y probar antes de compartir instrucciones de uso.

## Prompt para retomar

> Lee 00_INICIAR_AQUI.md y HANDOFF_FUDIA_REPORTES_2026-09-15.md. Vamos a crear la skill de reportes rápidos y precisos de operaciones, movimientos de inventario y compras de fudIA. Usa el piloto local; verifica las fuentes, fechas, unidades y pendientes. No mezcles pruebas con producción ni supongas que una solicitud equivale a una entrega.
