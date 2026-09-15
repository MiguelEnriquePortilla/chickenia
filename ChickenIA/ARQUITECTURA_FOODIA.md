# FoodIA — propuesta de arquitectura y piloto

Fecha: 14 de septiembre de 2026. Estado: piloto local implementado e instalado; código remoto publicado, pendiente de configurar OAuth.

Actualización de implementación: MCP HTTP y servicios de listas/compras/recepción/costos/anulación implementados y probados localmente. Código publicado en ChickenIA; conexión remota a cuentas reales pendiente de OAuth. Miguel confirmó que no hace falta habilitar a Lilian todavía: primero probar funcionalidades y flujo en un entorno local aislado. No bloquear estas pruebas por proveedor OAuth, plan de ChatGPT ni compatibilidad Android. El piloto local usa PGlite persistente dentro de `.local/foodia-pilot`; no conecta a Neon. Ver `FOODIA_PILOTO.md` para alcance e invocación.

## Objetivo acordado

Miguel y Lilian operarán compras, inventario y análisis desde sus propias cuentas de ChatGPT. Lilian usa principalmente Android y después laptop. El servicio compartido debe funcionar con la computadora de Miguel apagada. ChickenIA conserva Supervisión/asistencia, Dashboard simplificado y preguntas rápidas deterministas. Sus módulos operativos se ocultan de la navegación habitual, pero se preservan servicios, rutas y datos.

## Capas propuestas

1. ChatGPT: conversación, dictado y tickets adjuntos para preparar capturas. Compatibilidad completa de MCP y voz en Android pendiente de prueba; no prometerla por cambiar de plan.
2. Plugin: habilidades de captura/análisis y conexión MCP remota autenticada. El skill guía la conversación; el servidor valida todas las reglas.
3. MCP: herramientas concretas de consultar existencias, buscar artículos/proveedores, preparar y registrar compras, registrar recepciones, consultar gastos y corregir registros. Sin SQL libre de escritura ni acceso directo del modelo a credenciales de base de datos.
4. Servicios de negocio compartidos con la web: validación, permisos, unidades, idempotencia, historial y transacciones. Reutilizar inventory-domain e inventory-store mediante una capa de servicio, sin simular cookies del navegador.
5. Persistencia: ampliar PostgreSQL/Neon existente con tablas relacionales de compras. Vercel aloja la aplicación/API; comprobar transporte MCP y despliegue antes de seleccionar su alojamiento definitivo.

## Identidad y separación entre negocios

Propuesta: OAuth por usuario, membresías por negocio y permisos en servidor. El negocio se obtiene de la identidad autorizada, nunca se acepta sin validación desde un argumento de ChatGPT. La clave compartida del piloto web no será la credencial del conector. No cambiar todavía el acceso web vigente.

Entidades propuestas: businesses, users, memberships, suppliers, purchase_documents, purchase_lines, payments, goods_receipts, receipt_lines y audit_events. Todas las entidades operativas nuevas llevan business_id y referencias dentro del mismo negocio. Chicanito será el primer negocio.

El inventario actual es un estado global único inv_state(id=1). Añadir business_id solo a compras NO hace multiempresa al sistema. El piloto se limita a Chicanito; antes de admitir otro negocio se requiere migrar y probar aislamiento de inventario, supervisión, consultas e históricos. No reinterpretar ni borrar datos existentes.

## Compra y recepción

### Regla confirmada por Miguel: compra verificada por Lilian

Destino confirmado por Miguel: todos los artículos de este abastecimiento de Sam’s van a CEDIS. Usar CEDIS como destino predeterminado del flujo; no volver a preguntarlo en cada captura. No extender automáticamente esta confirmación a otros proveedores o negocios. El destino no establece por sí solo la hora de llegada: si Lilian indica que la mercancía sigue en tienda o traslado, conservar ese estado sin presentarla como existencia disponible en CEDIS.

Lilian normalmente compra y verifica las cantidades en el momento de la compra. La captura conversacional debe permitir registrar ambos hechos en una sola operación, sin exigir una segunda verificación ni otro formulario. Conservar los hechos relacionados internamente para trazabilidad. La ubicación física de entrada se debe definir: verificación en tienda no implica por sí sola llegada a CEDIS. Preguntar el destino solo si no está establecido y afecta el saldo.

El formato real de Sam’s aportado el 14 de septiembre contiene PRODUCTO, EXISTENTES y PEDIDO. Es una lista de abastecimiento sin precios. EXISTENTES es una observación de existencia, no una entrada nueva ni un reemplazo automático del saldo. PEDIDO expresa una cantidad solicitada; solo se convierte a compra cuando Lilian indique lo efectivamente comprado. No se asume que todo lo solicitado estuvo disponible.

Recorrido prioritario: Lilian dicta “Compré y verifiqué en Sam’s…” con cantidades reales; el sistema identifica artículos y presentaciones conocidas, completa el borrador, pide únicamente datos faltantes necesarios y registra la operación autorizada con folio. Si dicta “Necesitamos comprar…”, registra una lista/pedido sin afectar existencias. Permitir precios pendientes explícitos para no bloquear una captura de cantidades; esos documentos no se presentan como gasto completo en análisis hasta completar importes. Esta política de importes pendientes es una propuesta a validar al implementar.

En la foto, el pedido de jugo de naranja está parcialmente tapado por el cursor. No inferir su cantidad. Bulto, bolsa, bote y pieza requieren presentación validada antes de convertir a kg o litros.

- Documento: proveedor, lugar/canal de compra, fecha, moneda, comprobante, destino, responsable y estado.
- Renglón: artículo, descripción original, presentación, cantidad comprada, unidad, conversión validada, precio, descuento, impuestos e importe según el comprobante. Importes monetarios en unidades menores enteras; conservar escala vigente de cantidades.
- Pago: importe, fecha, medio y referencia; permite pagos parciales sin confundir pago con recepción.
- Recepción: cantidades efectivamente recibidas y destino, vinculadas a los renglones de compra; admite recepción parcial y registro de diferencia.
- El lugar de compra puede ser Central de Abastos y el proveedor un local específico. No mezclarlos en un único catálogo.
- Comprar no aumenta por sí solo las existencias. Compra y recepción inmediata pueden registrarse juntas cuando el usuario lo indique y todos los datos estén completos.
- Una recepción nueva y su efecto en inventario deben ser atómicos, con identificador único, versión y referencia cruzada. Reintentar no duplica. La recepción existente de inventory-domain también debe reconocer esa vinculación para evitar doble captura entre web y chat.
- Correcciones mediante eventos vinculados/reversiones; no borrar el rastro original.

## Experiencia propuesta

Texto, dictado o ticket → borrador estructurado → aclarar únicamente campos faltantes/ambiguos → resumen de lo que se registrará → escritura autorizada → folio, totales y efecto real en inventario. Borradores no afectan existencias. No inventar presentaciones, unidades, impuestos ni cantidades ilegibles. Comprobante adjunto requiere almacenamiento privado y acceso autorizado; elegir proveedor de archivos al implementar.

La autorización expresa de una operación completa puede permitir ejecutarla sin repetir preguntas, respetando las confirmaciones exigidas por el cliente. Compras a proveedores externos o pagos bancarios no forman parte de este piloto: se registran operaciones ya realizadas.

## Análisis inicial

## Abastecimiento de Central de Abastos: puente confirmado

### Flexibilidad confirmada por Miguel

Los mínimos y máximos son exclusivamente orientadores. No bloquear compras por superar el máximo, quedar fuera de un rango o incluir productos que no figuren en la guía/lista. No exigir autorización adicional únicamente por esas circunstancias. Se pueden agregar productos nuevos dentro de la misma conversación, sin obligar a abrir otra pantalla. Buscar primero coincidencias y alias para evitar duplicados; si no existe, permitir el alta con nombre y unidad suficientes, pidiendo presentación solo cuando una conversión la requiera. Las sugerencias y comparaciones no sustituyen la cantidad elegida por la persona. Se mantienen las validaciones de integridad: cantidades válidas, unidades compatibles, identidad y prevención de duplicados.

Miguel aportó dos fotos el 14 de septiembre: una guía impresa de vegetales con PRODUCTO/CANTIDAD/MIN/MAX y anotaciones; y un control semanal manuscrito con existencia anterior/nueva, columnas diarias y firmas. Explica que la guía se contrasta contra existencias para decidir la compra, y que el segundo documento refleja lo comprado/llegado. Falta enlazar ambos con cantidades efectivas y costos. La semántica exacta de las columnas diarias no queda establecida por la foto: no importar sus cifras como entradas o saldos sin aclaración.

Diseñar la cadena: versión de guía → observación de existencia fechada → lista de compra → compra efectiva con precio → recepción vinculada → saldo e historial. Cada renglón conserva referencias a su antecedente; se permiten compras parciales, faltantes, sustituciones y varios proveedores por salida. Una sola captura puede completar compra y recepción cuando así ocurra; no exigir doble verificación.

Entidades adicionales propuestas: replenishment_guide_versions, replenishment_guide_lines, stock_observations, shopping_lists, shopping_list_lines. La lista conserva la existencia y versión de guía usadas para decidir, además de cantidad sugerida y cantidad finalmente elegida. No sobrescribir ese antecedente cuando cambie el saldo.

MIN/MAX son valores orientadores aportados, no reglas automáticas interpretadas todavía. Confirmar si son umbrales de existencia, cantidades por compra o coberturas, y qué representa CANTIDAD. No ejecutar automáticamente máximo menos existencia hasta resolver esa semántica. Mantener unidades y notas originales; valores aproximados, contradicciones y equivalencias de arpillas/bolsas/bultos requieren validación. Un peso real de compra prevalece para ese lote sobre una equivalencia aproximada del empaque.

Prioridad de captura por voz: producto, cantidad efectivamente comprada, unidad, precio por unidad o total, proveedor cuando se conozca y destino. Para papa, guardar kg reales y precio/kg, calculando importe con aritmética del servidor y señalando diferencias contra total declarado. No inventar costo si falta. Si la compra y recepción difieren, registrar ambos valores y la diferencia sin volver a sumar lo recibido.

Ejemplo exclusivamente ilustrativo, no dato de las fotos: “De la lista de Central compré 45 kilos de papa a 18 pesos el kilo; llegó todo”. Vincular el renglón de lista, calcular 810 pesos, registrar compra y recepción según destino confirmado, y devolver folio. No registrar este ejemplo en ninguna base operativa.

Las fotos se usan como evidencia para el diseño; todavía no constituyen una importación validada del catálogo, mínimos/máximos, precios ni movimientos.

## Análisis inicial (alcance)

Gasto por periodo/proveedor/lugar, precio comparable por unidad, cambios de precio, productos comprados y recepciones pendientes. Respuestas con periodo, fuentes y fecha de actualización. Separar gasto comprado, pagado y recibido. No calcular utilidad ni costo completo sin ventas, consumos y criterios de costeo suficientes.

## Secuencia y validación

1. Validar canal de conexión en las dos cuentas, especialmente Android: descubrimiento de herramientas, autenticación, lectura, escritura de prueba y dictado/voz por separado. Usar entorno de pruebas sin movimientos reales. Si Android no admite el recorrido, resolver alternativa con Miguel antes de anunciarlo como disponible.
2. Tomar compras reales representativas para cerrar campos, presentaciones y recepción. Diseñar migración aditiva y servicio de compras.
3. Implementar compras, recepción e historial con pruebas de duplicados, transacciones, permisos, unidades y concurrencia con inventario web.
4. Conectar herramientas MCP y skill. Probar que Lilian registra y Miguel consulta el mismo folio, incluyendo reconexión/reintento desde móvil.
5. Ampliar análisis. Publicar por flujo GitHub/Vercel existente tras verificar el piloto. El servicio necesita identidad por usuario antes de exponer escrituras remotas.

## Información que falta

- Tres ejemplos reales de compra: Central de Abastos, Sam’s y proveedor local (ticket/foto o transcripción).
- Confirmado para el abastecimiento de Sam’s mostrado: destino CEDIS; Lilian compra y verifica en el momento, sin doble verificación. Confirmar otros destinos solo si aparecen nuevos flujos que lo requieran.
- Posteriormente: identidad/correos a habilitar y configuración del proveedor OAuth, sin contraseñas por chat; elección de archivos privados y acceso al despliegue.

## Referencias oficiales consultadas

- https://developers.openai.com/plugins
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://learn.chatgpt.com/docs/features/voice

Las referencias describen el mecanismo; no prueban disponibilidad en las cuentas ni en Android.
