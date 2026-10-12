# Existencias en pedidos — 12 de octubre de 2026

Publicado con autorización de Miguel mediante `a49961a`, enviado a main el 12 de octubre de 2026. Verificación pública: pedidos.html, js/regular-orders.js y css/regular-orders.css respondieron correctamente y coincidieron con los archivos locales, normalizando saltos de línea.

Los cuatro proveedores (SAMS, Peregrina, Plásticos y Central de Abastos) incorporan Existencia junto a A pedir. Ambos campos usan la unidad del producto. Existencia admite cero y decimales; vacío significa sin conteo. Los borradores previos se conservan. Limpiar el pedido elimina cantidades solicitadas y nota, conservando las existencias.

Las existencias se guardan en el borrador del dispositivo. Copiar, compartir, WhatsApp y captura siguen mostrando únicamente las cantidades solicitadas al proveedor. No se registraron operaciones ni se enviaron mensajes.

## Histórico pendiente

Miguel indicó conservar estas cantidades en un histórico para referencia de gastos en una etapa posterior. El almacenamiento actual es un borrador local que se actualiza, no un histórico compartido. La siguiente etapa debe guardar una fotografía por pedido confirmado con fecha, proveedor, producto, unidad, existencia al pedir y cantidad solicitada; vincular posteriormente cantidad recibida, costo y gasto real. Conservar cero frente a dato no capturado. No inferir gastos a partir de existencias ni confundir pedido con compra efectivamente recibida.

## Validación

Sintaxis y construcción de archivos públicos aprobadas. Recorrido aislado de navegador aprobado: cuatro proveedores, persistencia de cero y decimales, separación por proveedor, conservación de existencias al limpiar, texto de proveedor, vista de captura y móvil/escritorio. Sin escrituras en datos reales.
