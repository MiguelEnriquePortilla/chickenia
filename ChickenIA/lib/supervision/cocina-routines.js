// Cocina: acuerdos de Miguel, septiembre 2026. Preparaciones en kg.
module.exports = [
  [
    "Revisar orden de producción y saldo anterior disponible",
    "media",
    false,
    null,
    "PROCESO",
    "8:00 a. m.; considerar residual sin registrarlo como producción nueva",
    "apertura",
    "daily"
  ],
  [
    "Calentar agua para preparar el arroz",
    "media",
    false,
    null,
    "PROCESO",
    "Inicio de preparación a las 8:00 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Adobo tradicional hervido",
    "media",
    true,
    "kg",
    "INSUMO",
    "Kg listos para servicio a las 9:30 a. m.; hervir adobo existente no es producción nueva",
    "apertura",
    "daily"
  ],
  [
    "Arroz blanco preparado",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Arroz rojo preparado",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Nopales preparados",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Puré de papa preparado",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Papa cambray preparada",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Espagueti preparado",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Ensalada de col preparada",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Zanahoria en palitos para campesina",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Crema para espagueti preparada",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Pesar preparación obtenida; lista para las 9:30 a. m.",
    "apertura",
    "daily"
  ],
  [
    "Verificar producción inicial con Nancy",
    "alta",
    false,
    null,
    "PROCESO",
    "9:30 a. m.; disponibilidad por producto y faltantes identificados",
    "apertura",
    "daily"
  ],
  [
    "Preparar comida del personal y registrar consumo",
    "media",
    false,
    null,
    "PROCESO",
    "Comida lista; registrar producto utilizado como consumo, no venta",
    "operacion",
    "daily"
  ],
  [
    "Pasta de codo cocida",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Registrar kg obtenidos; medios paquetes solo como referencia de pasta",
    "operacion",
    "daily"
  ],
  [
    "Pasta de espagueti cocida",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Registrar kg obtenidos; medios paquetes solo como referencia de pasta",
    "operacion",
    "daily"
  ],
  [
    "Papa gajo preparada para CRUJI",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Registrar kg obtenidos; medios paquetes solo como referencia de pasta",
    "operacion",
    "daily"
  ],
  [
    "Ajo preparado",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Registrar kg obtenidos; medios paquetes solo como referencia de pasta",
    "operacion",
    "daily"
  ],
  [
    "Adobo tradicional molido",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Registrar kg obtenidos; medios paquetes solo como referencia de pasta",
    "operacion",
    "daily"
  ],
  [
    "Cebolla fileteada",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Aproximadamente 2 kg; registrar peso real",
    "operacion",
    "daily"
  ],
  [
    "Guajillo cocido para adobo tradicional",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Registrar kg obtenidos; medios paquetes solo como referencia de pasta",
    "operacion",
    "daily"
  ],
  [
    "Revisar existencias y reportar necesidades de abastecimiento",
    "media",
    false,
    null,
    "PROCESO",
    "Revisar leche, aceite, jabón y cloro; anticipar faltantes hasta la compra semanal",
    "operacion",
    "daily"
  ],
  [
    "Elaborar con Nancy la orden de producción del siguiente día",
    "media",
    false,
    null,
    "PROCESO",
    "Productos, kg requeridos y fecha definidos según existencias y ventas",
    "operacion",
    "daily"
  ],
  [
    "Integrar necesidades a la solicitud semanal de compras",
    "media",
    false,
    null,
    "PROCESO",
    "Agrupar proveedores locales y foráneos; compra urgente solo con motivo; autoriza Lilian",
    "operacion",
    "daily"
  ],
  [
    "Limpiar mesas y barras de cocina durante el servicio",
    "media",
    false,
    null,
    "LIMPIEZA",
    "Superficies limpias y utilizables",
    "operacion",
    "daily"
  ],
  [
    "Organizar inventario y revisar etiquetas",
    "media",
    false,
    null,
    "PROCESO",
    "Conservar fecha original de preparación y vigencia al reponer etiquetas",
    "operacion",
    "daily"
  ],
  [
    "Mezcla para marinar pollo ROSTI",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Producción semanal según programación y ventas; pesar kg obtenidos",
    "operacion",
    "weekly"
  ],
  [
    "Adobo de tres chiles",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Producción semanal según programación y ventas; pesar kg obtenidos",
    "operacion",
    "weekly"
  ],
  [
    "Salsa barbecue",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Producción semanal según programación y ventas; pesar kg obtenidos",
    "operacion",
    "weekly"
  ],
  [
    "Salsa chipotle",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Producción semanal según programación y ventas; pesar kg obtenidos",
    "operacion",
    "weekly"
  ],
  [
    "Marinado para costilla",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Producción semanal según programación y ventas; pesar kg obtenidos",
    "operacion",
    "weekly"
  ],
  [
    "Costilla porcionada y marinada",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Producción semanal según programación y ventas; pesar kg obtenidos",
    "operacion",
    "weekly"
  ],
  [
    "Ajo picado en aceite",
    "media",
    true,
    "kg",
    "PRODUCCIÓN",
    "Producción semanal según programación y ventas; pesar kg obtenidos",
    "operacion",
    "weekly"
  ],
  [
    "Contar y registrar existencias finales de cocina",
    "alta",
    false,
    null,
    "EVIDENCIA",
    "Kg sobrantes por preparación identificados para el día siguiente",
    "cierre",
    "daily"
  ],
  [
    "Confirmar con Nancy la orden de producción del siguiente día",
    "media",
    false,
    null,
    "PROCESO",
    "Verificar orden ya elaborada; no capturar otra vez",
    "cierre",
    "daily"
  ],
  [
    "Confirmar necesidades en la orden semanal de compras",
    "media",
    false,
    null,
    "PROCESO",
    "Solicitud registrada o sin necesidad de compra; urgencias justificadas",
    "cierre",
    "daily"
  ],
  [
    "Limpiar y organizar el área de cocina",
    "media",
    false,
    null,
    "LIMPIEZA",
    "Mesas, barras e inventario limpios y ordenados",
    "cierre",
    "daily"
  ],
  [
    "Obtener pase de salida de Nancy",
    "alta",
    false,
    null,
    "EVIDENCIA",
    "5:00 p. m.; orden de producción, compras y limpieza verificadas",
    "cierre",
    "daily"
  ]
];
