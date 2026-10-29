# Plataforma móvil coherente

Goal: aplicar la claridad del Inicio aprobado a toda la operación, priorizando celular.
Architecture: HTML y JavaScript existentes, una capa compartida de estilos y componentes nativos accesibles. Sin migraciones ni cambios a cálculos.
Tech Stack: HTML/CSS/JS, Node, Python Playwright, PGlite de pruebas.
Spec: revisión .impeccable/critique/2026-10-29T04-25-26Z__index-html.md y acuerdos de Miguel en esta conversación.

## Global Constraints
Sin flechas, chevrones o triángulos de navegación. Conservar nombres aprobados, historial, 120%, salidas entregadas y distinción cero/vacío. No operaciones reales ni mensajes externos. Inicio conserva identidad. Publicación autorizada por Miguel. Cambios en checkout aislado; no incluir documentos locales ajenos.

## Task 1: base compartida y navegación
- [x] Editar css/shared-shell.css, js/shared-shell.js, js/area-navigation.js, index.html y js/nav-polish.js: menú móvil superpuesto sin franja permanente, título funcional visible, controles 44px y tipografía legible, estados Mostrar/Ocultar sin flechas.
- [x] Integrar estilos comunes en las páginas activas. Comprobar a 320, 390 y 1440px con navegación por teclado.

## Task 2: captura y pedidos
- [x] Editar js/equipo-checklist.js, js/production-paper.js, pedidos.html, js/regular-orders.js y css/regular-orders.css. Captura antes de compartir, fecha consultada consistente, guardado explícito, búsqueda de productos y filtro de cantidades en Pedidos. Conservar datos locales y autosave.
- [x] Verificar con test/equipo_checklist_browser.py y cobertura aislada de pedidos/producción. No introducir valores operativos.

## Task 3: inventarios
- [x] Editar js/protein-view.js, js/protein-inventory.js, js/rastro.js, js/rastro-view.js y sus HTML/CSS necesarios: origen/destino claros, formularios compactos, acciones correctivas secundarias, sin flechas ni recepción adicional.
- [x] Ejecutar test/protein_browser.py y pruebas de inventarios con datos ficticios.

## Task 4: resumen y reportes
- [x] Editar dashboard.html, css/dashboard-feed.css, js/dashboard-cards.js, js/dashboard-summary.js, js/dashboard.js, js/equipo-weekly.js: resumen de secciones cerradas, filtro pendientes primero para evaluaciones, sin flechas, mantener compartir e histórico.
- [x] Ejecutar test/dashboard_feed_browser.py y test/summary-reports.test.js, conservar fecha y no registrar operaciones.

## Task 5: integración y publicación
- [x] Build y suites Node/browser apropiadas; revisar pantallas light/dark y móvil/escritorio, errores de consola y overflow. Revisión independiente final y corregir defectos.
- [x] Commit solo archivos seleccionados; push autorizado y comprobar GitHub Actions y producción. Registrar limitación de hardware móvil si no disponible.

## Ledger
Preflight: tareas 1 y 2 comparten contrato de encabezados, se conserva encabezado Pedidos; tarea 1 controla CSS común, demás tareas usan clases propias. Tareas 3 y 4 comparten datos de proteína de solo lectura: sin cambios API. Cada tarea conserva sus pruebas y archivos. Ningún conflicto detectado.
Ruling: usar worktree manual porque el administrador de Codex devuelve Not a git repository; checkout aislado en .worktrees/plataforma-movil. No modificar checkout original.

Task 1-4: complete. Revisi?n independiente: corregidos foco de men?, edici?n de cantidad filtrada y coherencia de fecha tras fallo de guardado. 38 pruebas Node aprobadas; siete recorridos de navegador aislado y comprobaci?n compartida de cinco pantallas/temas/tama?os aprobados. Sin operaciones reales.

Publicaci?n: 4438f9f y f36360a desplegados READY; GitHub Actions 40818883066 y 40874519033 aprobados. Comprobados archivos p?blicos y lectura autenticada de evaluaciones, 120%, orden de pendientes e inventarios; consola sin errores. Ajuste final: ocultar desplazamiento horizontal interno del men?. Prueba compartida de cinco pantallas aprobada despu?s del ajuste. No capturas reales ni mensajes.
