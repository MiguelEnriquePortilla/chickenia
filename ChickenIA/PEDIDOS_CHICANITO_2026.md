# Actualización vigente — Peregrina y unidades, 11 octubre 2026

Miguel aceptó los ajustes y pidió actualizar la documentación. Publicado y verificado en ChickenIA: `1608cc1` agrega **Limón Pimienta** y **Chile Chipotle** a Peregrina; `c5d3ce0` completa sus unidades **Kg** y la unidad **Bolsas** de Ajos en SAMS. Peregrina queda con **25 renglones** (19 productos regulares y 6 de harina especial). Cantidades inicialmente vacías; formato restante sin cambios.

Borradores previos conservados mediante una migración única: las cantidades de los seis renglones de harina se desplazan a sus índices nuevos, sin asignarse a los artículos agregados. Build, sintaxis, conteo y migración comprobados para `1608cc1`; los dos archivos públicos cotejados con los locales. Para `c5d3ce0`, diff limitado a tres unidades y consulta pública confirmó Kg, Kg y Bolsas. No se enviaron pedidos ni se registraron compras o movimientos de inventario.

Sin ajustes funcionales pendientes de esta solicitud. Esperar nuevas indicaciones; los apartados inferiores son antecedentes.

# Actualización 11 octubre 2026 — Central de Abastos y listas limpias

Autorizado por Miguel: implementar y publicar. Central de Abastos: 27 artículos legibles de la foto, incluidos los manuscritos; cantidades y unidades recortadas no inferidas. SAMS agrega Ajos (20 artículos). Plásticos agrega Fibras verdes, Fibras, Rollos para computadoras, Rollos para impresora y Encendedores (20 artículos). Peregrina conserva 23 renglones.

Todas las listas muestran únicamente artículo y unidad disponible. Copiar, compartir, WhatsApp y captura omiten marcas, descripciones y habituales. Medidas de plásticos y usos distintivos conservados. Borradores previos compatibles: nuevos artículos añadidos al final, sin reordenar los existentes. Cuatro pestañas en dos columnas en móvil. Sin mensajes ni compras registradas. Build y recorrido aislado de navegador aprobados.

Los detalles de abajo son antecedentes; esta actualización reemplaza el formato con descripciones.

# Pedidos Chicanito 2026

Implementacion: 01f9657, enviada a main el 11 de octubre de 2026 por solicitud de Miguel.

Apartado /pedidos.html, accesible desde Inicio y el menu compartido. Pestanas SAMS, PEREGRINA y PLASTICOS. Fuente: cinco fotos del documento Pedidos para Chicanito 2025 proporcionadas en el chat. Ortografia corregida (incluido Sabroseador); cantidades habituales como referencia, campos inicialmente vacios. 19 productos de SAMS, 17 de Peregrina, 15 de plasticos; 6 renglones adicionales para mezcla de harina en Peregrina. No se infieren equivalencias ni costos.

Cantidades positivas y decimales; blancos y ceros quedan fuera del texto. Borradores independientes por proveedor en localStorage de este dispositivo, sin sincronizacion entre usuarios. Nota opcional. Copiar pedido, Compartir mediante selector nativo cuando disponible (alternativa copiar), Abrir WhatsApp para elegir destinatario y confirmar envio. Vista limpia para captura. No hay envio automatico, integracion de WhatsApp Business ni movimientos de inventario.

Ambiguedades conservadas: harina 20 bultos en titulo / 25 en listado; sal escrita 3.800 kg, ambos campos sin sugerencia numerica. Jamon indica dos piezas y 900 g, sin equivalencia inferida. Mostaza y Sabroseador condicionales; soya mensual; condimento y Knorr quincenales; servilletas segun ventas. Margarina nombrada segun la descripcion de la fuente.

Validacion: compilacion, 12 pruebas existentes de inventario/acceso/rutinas y recorrido aislado de navegador aprobado (catalogos, decimales, exclusiones, separacion, persistencia, copia, compartir, enlace WhatsApp, vista captura, limpieza, movil/escritorio y tema oscuro). Se simularon las acciones externas: no se enviaron mensajes ni se registraron compras.

Archivos: pedidos.html, js/regular-orders-data.js, js/regular-orders.js, css/regular-orders.css, test/regular_orders_browser.py; integracion en index.html, js/area-navigation.js y scripts/build-static.js.

Texto WhatsApp: emojis de encabezado, titulo/proveedor/cantidades en negritas con asteriscos, detalles en cursiva con guiones bajos, productos en lista. Igual para copiar, compartir y enlace WhatsApp.

Cierre aprobado por Miguel el 11/oct: version final 0e6e7f8 publicada y CSS cotejado. Menu entre Caja y Dashboard; contraste oscuro corregido; pestanas en una fila y acciones compactas en movil. Ver REPORTE_SESION_2026-10-11_PEDIDOS.md.
