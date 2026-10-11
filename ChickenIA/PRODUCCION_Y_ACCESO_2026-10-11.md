Encabezado unificado 11/oct (criterio final autorizado): marca Chicken ChicanIA y SVG existente, control de tema; sin enlaces superiores de Inicio/Volver/Supervisión/Dashboard. Navegación exclusivamente por menú lateral; título propio bajo el encabezado. Misma paleta y márgenes entre apartados. Caja: inicialización digital no cuenta como edición; navegación interna guarda antes de salir y permanece si falla; advertencia al cerrar con cambios pendientes se conserva. Importación de foto conserva estado pendiente. Build mantiene data-environment=production aunque body tenga otros atributos. Pruebas aisladas: encabezado único, menú, arranque, 320/390/1280; API real de Caja (vacío sin aviso, guardar al navegar y recargar), Producción, Supervisión y Proteínas.

Corrección de navegación 11/oct: al abrir desde fuera, bienvenida y después Inicio (manifest start_url=/). Inicio desde un enlace interno omite la bienvenida mediante una marca de un solo uso de 15 segundos; ninguna marca persistente omite el arranque. Menú: Inicio, Supervisión, Producción Diaria, Rastro, Proteínas Sucursal, Proteínas Móvil, Caja, Dashboard. Pregúntale retirado del menú y de Inicio. Dashboard incluye botón Inicio visible. CSS de resumen de Caja limitado a .layout>aside para no afectar la barra lateral. Pruebas: apertura nueva, navegación interna, reapertura de pestaña, orden exacto, anchos 320/390/1280, producción y supervisión con API aislada.

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

Inventario y consultas muestran selector de nombre, sin contraseña. Únicas opciones: NANCY, LILIAN y MIGUEL. No se agregan nombres desde cuentas configuradas y se rechazan sesiones de otros nombres. La sesión firmada existente continúa compartida entre módulos; se conservan cookie HttpOnly y comprobaciones de origen. La clave del piloto y hashes de contraseña dejan de validarse al entrar. La selección identifica el nombre declarado; no verifica identidad personal. El acceso operativo por nombre conserva el permiso amplio de captura que ya tenía el piloto. La sesión sigue requiriendo el secreto interno del servidor, que no es una contraseña para el equipo.

## Diseño

Ajuste posterior pedido por Miguel: botones de Inicio con filo dorado discreto e iconos dorados; Inicio y regreso con botón e icono consistente. Se conserva el orden y la distribución de los apartados y de los campos de inventario. Logo superior de Inicio desde el PNG oficial local, completo y centrado, sin recorte circular; marca de agua centrada, completa y más tenue. Inventarios: textos repetidos retirados y etiquetas breves («Al abrir», «Hay ahora», «Llegó del proveedor», «Se marinó», «Sale a…»). Se conservan datos, diferencias, historial, validaciones y confirmaciones; la nota de reinicio antigua deja de mostrarse en la captura, sin borrar su registro. Recorrido de proteínas en PostgreSQL aislado aprobado: movimientos, recepción, conteo y corrección, móvil/escritorio y ambos temas. Producción: guardado y recuperación aprobados.

Revisados manual original, extensión 2026, handoff, logos, ROSTI/CRUJI y tarjetas en `01-MARCA`. Poppins como tipografía funcional, blanco, navy y rojo de marca, espacios amplios y pocos controles. Producción usa cantidades en dos columnas en móvil, sin tabla horizontal. No se recrearon ni modernizaron logos en esta entrega.

## Validación

Pruebas aisladas de selección sin contraseña, sesión firmada, cookie alterada, nombre inválido, reglas de cantidades y límite de Rosticero. PostgreSQL aislado: guardado, historial de responsables, conflicto y conservación de producción anterior. Pruebas de inventario/acceso actualizadas al nuevo acuerdo. Navegador: selección de Nancy sin contraseña, retorno a Producción, guardado y recuperación; 320/390/1280 sin desbordamiento. Recorrido previo de Supervisión y Dashboard también aprobado. No se capturaron operaciones de prueba en producción.

Para retomar: observar facilidad de captura con Nancy y Lilian. La hoja nueva aún no alimenta gráficos de producción ni el cierre de caja; eso requiere un ajuste posterior explícito. Mantener cambios locales ajenos de skills/Formatos-Internos sin descartarlos ni publicarlos como parte de esta entrega.


## Navegación unificada (11 de octubre)
- El mismo menú lateral se comparte entre Supervisión, Producción Diaria, Dashboard, consulta, inventarios de proteínas Sucursal/Móvil, Rastro y Caja.
- Cada enlace abre directamente el apartado; resalta el destino actual. Inicio omite la bienvenida al navegar dentro de la plataforma y durante la misma sesión de pestaña.
- En celular el menú empieza contraído y se abre con el icono lateral. Se conserva la estructura de los formularios y sus datos.
- Estilos de navegación compartidos en css/shared-shell.css; montaje de páginas independientes en js/shared-shell.js. Los módulos con selección de área conservan sus propios callbacks.
- Validación: navegación y ausencia de splash repetido, anchos 320/390/1280; captura/recarga real de producción, supervisión por cortes y movimientos de proteínas en bases aisladas.
