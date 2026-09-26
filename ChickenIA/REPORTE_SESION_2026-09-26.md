# Cierre de sesión — ChickenIA, 26 septiembre 2026

**Publicado y confirmado por Miguel: «listo. ya quedo».** Versión funcional `52dae9735dfedff5d7d93c341a850c17a626b98f`, en `main` de `MiguelEnriquePortilla/chickenia` y en https://chickenia.chicanito.app. No quedan tareas automáticas pendientes de esta entrega.

## Entrega final

- **Inventario de proteínas Sucursal** (`/proteinas.html`): inventario anterior con Rostizado y Crujiente, conservando sus saldos, historial y mecanismo de operación.
- **Inventario de proteínas Chicanito Móvil** (`/proteinas-movil.html`): inventario independiente, únicamente Rostizado. Tiene sus propios movimientos, envíos, recepciones, conteos, rectificaciones, reinicios, resumen semanal e historial.
- Inicio y Supervisión ofrecen los dos accesos. El inicio de sesión conserva el apartado elegido y la fecha.
- Ambos mantienen el mecanismo existente de CEDIS. No hay transferencias automáticas entre los dos inventarios. El Dashboard previo sigue mostrando el inventario original.

Detalle técnico y reglas: [handoff de los dos inventarios](HANDOFF_PROTEINAS_MOVIL_2026-09-26.md).

## Datos y continuidad

No se migraron ni copiaron saldos de Sucursal a Móvil. Móvil se entregó sin capturas; su primera captura de gerencia establece las cantidades iniciales. Eso describe la entrega, **no afirma su saldo actual**: puede haber operación posterior.

No se ejecutó ninguna apertura, rectificación, recepción ni reinicio real durante esta implementación. El reinicio real del 25/09 está cerrado: **no repetirlo**. Leer [cierre del 25/09](REPORTE_SESION_2026-09-25.md) para ese antecedente. Mantener pollos con hasta tres decimales y el régimen de acceso del piloto.

## Verificación realizada

- 11 pruebas aprobadas de dominio, API, unidades y acceso piloto con PostgreSQL aislado. Se comprobó el rechazo de Crujiente en Móvil y de recepciones cruzadas, la reversión ante fallos y la preservación exacta de Sucursal después de operar y reiniciar Móvil en pruebas.
- Construcción estática correcta. Recorrido de navegador con API real y base desechable: apertura, entrada, marinado, envío, recepción, recarga y aislamiento; revisión visual en escritorio y celular. Servidor temporal detenido.
- Vercel confirmó despliegue exitoso de `52dae97`. Se compararon con las fuentes locales cinco archivos públicos: `index.html`, `proteinas.html`, `proteinas-movil.html`, `js/protein-inventory.js` y `js/protein-view.js`. Ambos accesos se verificaron en el navegador de producción. La validación funcional con escrituras fue exclusivamente local.

## Git y publicación

El primer cambio de nombres (`7ed7eca`) no separaba inventarios; queda sustituido por `52dae97`. El contenido del commit local `99daf68` se publicó mediante el conector GitHub como `52dae97`, comprobando igualdad del árbol completo. `main` local quedó sincronizado con remoto; respaldo del commit local en `respaldo-separacion-movil-2026-09-26`.

El envío Git local falló sin diagnóstico concluyente; la lectura con OpenSSL funcionó y la publicación mediante el conector GitHub funcionó. No se comprobó caducidad de token. La rama `respaldo-publicacion-2026-09-26` conserva los commits pendientes originales de la primera publicación.

## Retomar

Empezar por [00_INICIAR_AQUI.md](00_INICIAR_AQUI.md), este reporte y el handoff del 26/09. Esperar una nueva solicitud de Miguel; no convertir instrucciones históricas en pendientes. El grafo `graphify-out/` sigue siendo histórico y no sustituye el código ni estos acuerdos.

Los cambios ajenos en `plugins/foodia-local/skills/cierre-caja/` y `../Formatos-Internos/` se conservaron y no pertenecen a esta entrega. fudIA local sigue siendo un frente independiente.
