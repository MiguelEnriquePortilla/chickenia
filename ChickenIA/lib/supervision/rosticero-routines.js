// Rutinas validadas con Miguel, 11 sep 2026. No inventar metas de receta.
module.exports = [
  [
    "Revisar orden de producción e inventario del cierre anterior",
    "alta",
    false,
    null,
    "PROCESO",
    "Orden disponible y sobrantes cotejados",
    "apertura"
  ],
  [
    "Iniciar primera carga de pollos según orden de producción",
    "critica",
    true,
    "pollos",
    "PRODUCCIÓN",
    "Cantidad según orden; anotar hora de inicio en observaciones",
    "apertura"
  ],
  [
    "Preparar papa cambray, cebolla y jalapeños de la primera tanda",
    "media",
    false,
    null,
    "PROCESO",
    "Según receta; proporciones pendientes de confirmar",
    "apertura"
  ],
  [
    "Revisar y preparar el pollo sobrante para recalentamiento",
    "alta",
    false,
    null,
    "PROCESO",
    "Conforme al procedimiento de conservación y recalentamiento; indicar si no hay sobrantes",
    "apertura"
  ],
  [
    "Limpiar y organizar barras, mesas y estación de adobos",
    "media",
    false,
    null,
    "LIMPIEZA",
    "Superficies limpias, despejadas y utensilios acomodados",
    "apertura"
  ],
  [
    "Preparar barras caliente y fría para recibir producto",
    "alta",
    false,
    null,
    "PROCESO",
    "Listas antes del montaje, conforme al procedimiento de operación",
    "apertura"
  ],
  [
    "Calentar y colocar los adobos en recipientes de servicio",
    "media",
    false,
    null,
    "PROCESO",
    "Adobos requeridos disponibles",
    "apertura"
  ],
  [
    "Recibir y montar producción inicial de cocina y freidoras",
    "alta",
    false,
    null,
    "INSUMO",
    "Productos y cantidades conforme a las órdenes de producción",
    "apertura"
  ],
  [
    "Verificar desechables, consumibles y adobo envasado para apertura",
    "media",
    false,
    null,
    "INSUMO",
    "Faltantes reportados a ventas/barras; cantidades de envasado pendientes de confirmar",
    "apertura"
  ],
  [
    "Validar área lista para vender a las 9:30 a. m.",
    "critica",
    false,
    null,
    "PUNTUALIDAD",
    "9:30 a. m.; registrar hora real y faltantes en observaciones",
    "apertura"
  ],
  [
    "Realizar siguientes cargas de rostizado según orden de producción",
    "alta",
    true,
    "pollos",
    "PRODUCCIÓN",
    "Total de pollos de las cargas posteriores; no incluir primera carga",
    "operacion"
  ],
  [
    "Resguardar pollos terminados en insertos dentro del Cambro",
    "alta",
    false,
    null,
    "PROCESO",
    "6 pollos por inserto; conforme al procedimiento de conservación",
    "operacion"
  ],
  [
    "Separar el jugo del rostizado para los adobos",
    "media",
    false,
    null,
    "PROCESO",
    "Reservar por separado; no verter en el inserto de pollos del Cambro",
    "operacion"
  ],
  [
    "Revisar y reponer productos de barra y adobos",
    "alta",
    false,
    null,
    "INSUMO",
    "Disponibilidad durante el servicio; reportar faltantes a cocina o freidoras",
    "operacion"
  ],
  [
    "Mantener salsa de adobo envasada disponible para venta",
    "media",
    false,
    null,
    "INSUMO",
    "Mínimos y máximos pendientes de confirmar",
    "operacion"
  ],
  [
    "Mantener barras y estaciones limpias y organizadas",
    "media",
    false,
    null,
    "LIMPIEZA",
    "Superficies utilizables y trastes sucios retirados",
    "operacion"
  ],
  [
    "Revisar consumibles y solicitar reposición a ventas/barras",
    "baja",
    false,
    null,
    "INSUMO",
    "Insumos disponibles para continuar el servicio",
    "operacion"
  ],
  [
    "Contabilizar y registrar los pollos sobrantes",
    "critica",
    false,
    null,
    "EVIDENCIA",
    "Registro coincide con existencia física; detallar enteros y piezas en observaciones",
    "cierre"
  ],
  [
    "Guardar sobrantes identificados en la cámara de refrigeración",
    "alta",
    false,
    null,
    "PROCESO",
    "Producto identificado con fecha y cantidad, conforme al procedimiento de conservación",
    "cierre"
  ],
  [
    "Entregar trastes sucios al área de lavado",
    "media",
    false,
    null,
    "PROCESO",
    "Sin trastes sucios pendientes de entregar",
    "cierre"
  ],
  [
    "Limpiar mesas, barras y superficies utilizadas",
    "media",
    false,
    null,
    "LIMPIEZA",
    "área sin residuos",
    "cierre"
  ],
  [
    "Organizar utensilios y materiales para el siguiente turno",
    "media",
    false,
    null,
    "PROCESO",
    "Materiales en su lugar y estaciones despejadas",
    "cierre"
  ],
  [
    "Dejar disponible el registro de sobrantes para la apertura siguiente",
    "alta",
    false,
    null,
    "EVIDENCIA",
    "Registro disponible; el sobrante no se captura como una entrada nueva de inventario",
    "cierre"
  ]
];
