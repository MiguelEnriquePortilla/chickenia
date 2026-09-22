# Estado vigente de ChickenIA — 22 septiembre 2026

Este documento reemplaza los pendientes y reglas generales de sesiones anteriores
cuando contradigan los acuerdos siguientes. Miguel pidió continuar con ajustes
concretos, sin volver a diseñar ni repetir preguntas ya resueltas.

## Acuerdos y entregas

- Supervisión tiene cuatro accesos: Cierre de Caja, Producción Diaria,
  Inventario de Rastro e Inventario de Proteínas.
- Proteínas se captura en **pollos completos con decimales**, separados en
  Rostizado y Crujiente. Tanto los pollos por preparar como los Pollos Marinados
  están físicamente en CEDIS. «Piezas sueltas» significa Pollos Marinados:
  no dividir esas cifras entre ocho. La producción diaria conserva sus unidades.
- Marinar traslada existencia entre estados; no aumenta el total. Salida a
  Sucursal descuenta de CEDIS. Recibir en Sucursal no vuelve a descontar.
- Rectificar Proteínas fija la cantidad real de ambos estados, con motivo,
  confirmación y registro anterior/nuevo/responsable. Publicado en `3d40d6b`.
- Bienvenida aprobada y publicada en `2d91154`: mascota original transparente,
  dos segundos desde que carga la imagen, barra decorativa «Preparando ChickenIA…»,
  botón «Entrar ahora» y salida automática de respaldo. No cambia el icono instalado.
  El splash nativo de Android es independiente de esta bienvenida dentro de la app.
- Esta entrega agrega **RECTIFICAR INVENTARIO** a Rastro. Elegir producto,
  escribir la cantidad real y explicar el error. Solo supervisión/gerencia
  (`manager`). No borra ni reescribe las capturas originales.
- Dashboard de administradores: Rastro muestra **día seleccionado y dos anteriores**.
  Por producto: había, llegó, salió, rectificación y quedó. Conserva kg/piezas;
  no suma unidades distintas. Sin existencia inicial aparece «Sin captura».

## Implementación y límites

Rastro usa `api/rastro.js`, `lib/rastro.js`, `rastro.html`, `js/rastro.js`.
El resumen usa `js/rastro-view.js`, `css/rastro.css` y `js/dashboard.js`.
Se conserva `inventory_movements`; el nuevo movimiento `rastro-adjustment`
guarda diferencia firmada y notas con cantidades antes/después, motivo y actor.
No necesita tablas nuevas y no mezcla los SKU de Proteínas con los de Rastro.

Se bloquean duplicados por revisión y transacción. No se permiten fechas futuras,
correcciones anteriores a movimientos posteriores del mismo producto, ni insertar
movimientos antes de una rectificación posterior. En ese caso se corrige la
existencia actual. Piezas enteras; kg con hasta tres decimales; cero sí es válido.
El histórico se calcula con todos los movimientos, no con las últimas 200 filas
que se muestran como bitácora. No incluye otros tipos de movimiento desconocidos.

## Validación y continuación

Pruebas de base local aislada verifican restas/sumas, saldo cero, decimales,
rechazo de duplicados/permisos/fechas y conservación del historial. Prueba de
navegador `test/rastro_inventory_browser.py`: guardar, cancelar, error sin perder captura,
recarga, tres días, móvil/escritorio y ambos temas. Nunca inserta datos reales.

Para próximos ajustes: leer este documento, `INVENTARIO_PROTEINAS.md`,
`BIENVENIDA_CHICKENIA.md` y `INFORMES_DIGITALES.md`. Graphify de código está en
`graphify-out/`; el grafo general de documentos del negocio en
`../../_herramientas/graphify-out/` se conserva separado. Regeneración de código:
`python -m graphify extract . --code-only --max-workers 2 --out .`.

Miguel autorizó commit y push. El commit de esta entrega se consulta en el historial
de Git; el despliegue de `main` es automático. La validación pública verifica
archivos y autenticación; la supervisora confirma sus cantidades reales con sesión.
No retomar capturas detenidas del 18/09 ni activar nuevos envíos de Telegram.
