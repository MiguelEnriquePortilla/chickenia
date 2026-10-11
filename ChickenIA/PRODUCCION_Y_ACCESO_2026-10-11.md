# Producción Diaria y acceso por nombre — 11 octubre 2026

Miguel pidió recuperar la lista del PDF `entregables/supervision-diaria-borrador/Formatos_Borrador_Produccion_Diaria.pdf` como apartado independiente **Producción Diaria**. También autorizó quitar contraseñas, conservar identificación por nombre y mantener la línea minimalista.

## Entrega

- Página `/produccion-diaria.html`, accesible desde Inicio, navegación y el pie de Supervisión.
- Cuatro áreas desplegables: Rosticero, Hornos, Freidoras y Cocina; 25 productos del papel y dos renglones «Otro» con nombre y unidad elegibles.
- Cuatro cantidades independientes: inventario previo, producción inicial, producción adicional acumulada e inventario al cierre. Vacío significa sin captura; cero significa cantidad cero.
- Rosticero produce como máximo 30 pollos nuevos en el día; el pollo adicional y toda la costilla corresponden a Hornos. Sobrante de ayer separado de la producción nueva. No se calculan ventas a partir del sobrante.
- Guardado automático al salir de cada campo. Fecha seleccionable, cantidades con hasta tres decimales, control de versiones para evitar sobrescribir otra captura y registro de quién guardó cada revisión.
- Datos en tablas nuevas `production_paper_days` y `production_paper_history`. Las capturas anteriores de producción/caja y sus revisiones no se migran, borran ni recalifican. El cierre financiero anterior sigue leyendo su fuente anterior; no se conecta automáticamente con esta hoja nueva.
- No altera las evaluaciones de Supervisión ni sus horarios. Práctica: 11 octubre; evaluación: 12 octubre.

## Acceso

Inventario y consultas muestran selector de nombre, sin contraseña. Opciones iniciales: Nancy, Lilian y Miguel, más nombres de cuentas configuradas. La sesión firmada existente continúa compartida entre módulos; se conservan cookie HttpOnly y comprobaciones de origen. La clave del piloto y hashes de contraseña dejan de validarse al entrar. La selección identifica el nombre declarado; no verifica identidad personal. El acceso operativo por nombre conserva el permiso amplio de captura que ya tenía el piloto. La sesión sigue requiriendo el secreto interno del servidor, que no es una contraseña para el equipo.

## Diseño

Revisados manual original, extensión 2026, handoff, logos, ROSTI/CRUJI y tarjetas en `01-MARCA`. Poppins como tipografía funcional, blanco, navy y rojo de marca, espacios amplios y pocos controles. Producción usa cantidades en dos columnas en móvil, sin tabla horizontal. No se recrearon ni modernizaron logos en esta entrega.

## Validación

Pruebas aisladas de selección sin contraseña, sesión firmada, cookie alterada, nombre inválido, reglas de cantidades y límite de Rosticero. PostgreSQL aislado: guardado, historial de responsables, conflicto y conservación de producción anterior. Pruebas de inventario/acceso actualizadas al nuevo acuerdo. Navegador: selección de Nancy sin contraseña, retorno a Producción, guardado y recuperación; 320/390/1280 sin desbordamiento. Recorrido previo de Supervisión y Dashboard también aprobado. No se capturaron operaciones de prueba en producción.

Para retomar: observar facilidad de captura con Nancy y Lilian. La hoja nueva aún no alimenta gráficos de producción ni el cierre de caja; eso requiere un ajuste posterior explícito. Mantener cambios locales ajenos de skills/Formatos-Internos sin descartarlos ni publicarlos como parte de esta entrega.
