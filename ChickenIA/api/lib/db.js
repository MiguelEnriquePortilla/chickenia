// lib/db.js — Conexión a Neon Postgres + creación/seed de tablas.
// Mismo patrón que chicanito-app y Chicanito Capital: CREATE TABLE IF NOT EXISTS,
// nunca hace falta correr una migración a mano. Se llama ensureTables() al inicio
// de cada función serverless que toque la base de datos.

const { neon } = require('@neondatabase/serverless');

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está configurada en las variables de entorno de Vercel.');
  }
  return neon(process.env.DATABASE_URL);
}

const CRITICALITY_WEIGHT = { baja: 1, media: 3, alta: 6, critica: 10 };

// Catálogo semilla — ubicaciones
const SEED_LOCATIONS = [
  { code: 'jojutla', name: 'Jojutla Mercado', type: 'tienda' },
  { code: 'moto-1', name: 'Chicanito Móvil 1', type: 'moto' },
  { code: 'moto-2', name: 'Chicanito Móvil 2', type: 'moto' },
  { code: 'moto-3', name: 'Chicanito Móvil 3', type: 'moto' },
];

// Catálogo semilla — áreas por tipo de ubicación
const SEED_AREAS = [
  { code: 'rastro', name: 'Rastro', location_type: 'tienda', order_index: 1 },
  { code: 'cocina', name: 'Cocina', location_type: 'tienda', order_index: 2 },
  { code: 'rosticero', name: 'Rosticero', location_type: 'tienda', order_index: 3 },
  { code: 'freidoras', name: 'Freidoras', location_type: 'tienda', order_index: 4 },
  { code: 'caja', name: 'Caja', location_type: 'tienda', order_index: 5 },
  { code: 'ventas_barras', name: 'Ventas / Barras', location_type: 'tienda', order_index: 6 },
  { code: 'trastes', name: 'Lavado de Trastes', location_type: 'tienda', order_index: 7 },
  { code: 'supervision', name: 'Supervisión (tienda)', location_type: 'tienda', order_index: 8 },
  { code: 'moto_recepcion', name: 'Moto — Recepción (8:30am)', location_type: 'moto', order_index: 1 },
  { code: 'moto_cierre', name: 'Moto — Cierre (6:00pm)', location_type: 'moto', order_index: 2 },
];

// Catálogo semilla — actividades. Tomadas verbatim de los checklists reales de
// Chicken Chicanito (Google Sheets "ACTIVIDADES POR AREAS 2") para las áreas de
// tienda, y del borrador v1 de supervisión de Moto Chicanito para las áreas de moto.
// criticality: baja | media | alta | critica — Miguel/Nancy deben ajustar estos pesos,
// son un primer criterio razonable, no una verdad definitiva.
//
// Tupla: [name, criticality, requiresQuantity, unit, indicatorType, target]
// indicatorType / target son el marco de 11 tipos acordado el 1 de septiembre
// (INSUMO, PRODUCCIÓN, EXCEPCIÓN, LIMPIEZA, FRECUENCIA, ANTICIPACIÓN, PUNTUALIDAD,
// DINERO, CALIDAD, PROCESO, EVIDENCIA). Se están cargando primero para Freidoras
// (piloto, 2 sep 2026, a partir de la transcripción de audio de Nancy/equipo) — el
// resto de áreas todavía no los trae, por eso sus tuplas se quedan en 4 elementos
// (indicatorType/target quedan NULL, sin romper nada).
const SEED_ACTIVITIES = {
  // --- Rastro: marco de 11 tipos (7 sep 2026) ---
  // Reescrito a partir de la transcripción de audio de Nancy/equipo del mismo día,
  // organizada en el mismo orden del audio (producción de proteínas / vegetales e
  // insumos frescos / abasto semanal de domingo / limpieza y equipo / cierre y pase
  // de salida). Ambigüedades del audio (marinado de pollo crujiente, leche, sal-
  // pimienta) confirmadas directamente con Miguel antes de cargarse aquí.
  rastro: [
    ['Pollo rostizado preparado', 'critica', true, 'piezas', 'PRODUCCIÓN', '100–200 piezas'],
    ['Pollo crujiente preparado', 'critica', true, 'piezas', 'PRODUCCIÓN', '45–90 piezas'],
    ['Costilla preparada', 'media', true, 'porciones', 'PRODUCCIÓN', '4–10 porciones'],
    ['Cebolla mediana en buen estado', 'baja', false, null, 'FRECUENCIA', 'revisión semanal'],
    ['Papa Alfa colgada y porcionada (15 kg/arpilla)', 'media', true, 'porciones', 'INSUMO', '1–2 porciones'],
    ['Papa cambray colgada', 'media', true, 'kg', 'INSUMO', '5–10 kg/arpilla'],
    ['Brócoli fresco y refrigerado', 'media', false, null, 'CALIDAD', 'fresco, sin defectos'],
    ['Perejil fresco', 'baja', false, null, 'CALIDAD', 'fresco, sin defectos'],
    ['Jitomate porcionado en cámara de proteínas', 'media', false, null, 'PROCESO', 'bolsas de 1.3 kg'],
    ['Jalapeño/serrano refrigerado y despalillado desde raíz', 'media', true, 'porciones', 'INSUMO', '1–2 porciones'],
    ['Marinado de pollo crujiente producido', 'alta', true, 'litros', 'INSUMO', 'mínimo 20 L'],
    ['Morrón fresco (preferencia color rojo)', 'baja', false, null, 'CALIDAD', 'color rojo, fresco'],
    ['Nopal limpio, corte de 1 cm', 'baja', true, 'porciones', 'INSUMO', '0.5–1 porción'],
    ['Harina para crujientes contabilizada', 'media', true, 'bultos', 'INSUMO', '8–30 bultos (20 kg c/u)'],
    ['Arroz para bulto', 'media', true, 'bultos', 'INSUMO', '1–3 bultos/semana'],
    ['Coles revisadas y contabilizadas', 'baja', false, null, 'INSUMO', 'por definir'],
    ['Revisión de calidad/cantidad de vegetales con supervisión', 'media', false, null, 'FRECUENCIA', 'quincenal (compra)'],
    ['Jabón en polvo', 'baja', true, 'bolsas', 'INSUMO', '3 bolsas de 1 kg/semana'],
    ['Leche', 'baja', true, 'piezas', 'INSUMO', '20 piezas (tetrapack 1 L)/semana'],
    ['Sal-pimienta (mezcla de la casa)', 'baja', false, null, 'INSUMO', '1 bote de 4 L/semana'],
    ['Hierbas de olor', 'baja', true, 'docenas', 'INSUMO', '2 docenas/semana'],
    ['Cloro Clarasol', 'media', true, 'garrafas', 'INSUMO', '2–9 garrafas'],
    ['Sal fina', 'baja', true, 'bultos', 'INSUMO', '1–4 bultos (25 kg c/u)'],
    ['Agua de garrafón', 'baja', true, 'piezas', 'INSUMO', 'máx 7 piezas (garrafón #1)'],
    ['Piso limpio y seco', 'media', false, null, 'LIMPIEZA', '100% diario'],
    ['Refrigeradores limpios y ordenados', 'media', false, null, 'FRECUENCIA', 'semanal'],
    ['Tanques de almacenamiento revisados', 'baja', false, null, 'FRECUENCIA', '2x/semana'],
    ['Mezcladora limpia, sin residuo de harina', 'media', false, null, 'FRECUENCIA', 'mensual (0 residuo)'],
    ['Contenedores de harina limpios', 'baja', false, null, 'FRECUENCIA', 'mensual'],
    ['Trapos y costales limpios y secos', 'baja', false, null, 'LIMPIEZA', '100%'],
    ['Cubetas y cajas de proteína limpias y en su lugar', 'media', false, null, 'LIMPIEZA', '100% diario'],
    ['Palas, peladores y cuchillos revisados', 'media', false, null, 'LIMPIEZA', '100% diario'],
    ['Baño lavado', 'baja', false, null, 'FRECUENCIA', '2x/semana'],
    ['Tinas para lavar pollo lavadas', 'media', false, null, 'LIMPIEZA', '100% diario'],
    ['Bidones de agua revisados', 'baja', false, null, 'LIMPIEZA', '100% diario'],
    ['Escobas, jaladores, recogedores y botes en existencia', 'baja', false, null, 'INSUMO', '100% diario'],
    ['Equipo y camioneta revisados (aceite, gasolina, neumáticos)', 'alta', false, null, 'FRECUENCIA', 'semanal (lunes)'],
    ['Paneles solares limpios', 'baja', false, null, 'FRECUENCIA', 'cada 15 días'],
    ['Cámara de refrigeración y refris lavados a fondo', 'media', false, null, 'FRECUENCIA', 'semestral'],
    ['Limpieza general de área', 'media', false, null, 'LIMPIEZA', '100% diario'],
    ['Limpieza de camioneta', 'baja', false, null, 'LIMPIEZA', '100% diario'],
    ['Costilla, pollo rostizado y crujiente verificados antes de salida', 'critica', false, null, 'EXCEPCIÓN', '0 faltantes'],
    ['Vegetales verificados antes de salida', 'alta', false, null, 'EXCEPCIÓN', '0 faltantes'],
    ['Áreas y utensilios ordenados antes de salida', 'media', false, null, 'PROCESO', '100%'],
    ['Existencias completas para pase de salida (jabón, sal, arroz, leche, sal-pimienta, cloro, agua, bolsas)', 'critica', false, null, 'EXCEPCIÓN', '0 faltantes'],
    ['Pase de salida generado y firmado', 'critica', false, null, 'EVIDENCIA', '100% diario'],
    ['Actividades escritas en pizarrón al pase de salida', 'baja', false, null, 'EVIDENCIA', '100% diario'],
    ['Registro de gastos de rastro', 'media', true, 'pesos', 'DINERO', '100% con evidencia'],
    ['Compra de gasolina (foto de recibo)', 'media', true, 'pesos', 'DINERO', '100% con evidencia'],
    ['Compra de hielo', 'baja', false, null, 'INSUMO', 'según necesidad diaria'],
    ['Pollo con hielo suficiente', 'alta', false, null, 'INSUMO', '100% cubierto'],
  ],
  // --- Cocina: marco de 11 tipos (7 sep 2026) ---
  // Reescrito a partir de la transcripción de audio de Nancy/equipo del mismo día,
  // en el orden del audio (apertura 8:00-10:00am: guisados / bloque 10:00-10:15am:
  // pastas, papa gajo, adobo, cebolla, guajillo / documentación y limpieza / pase de
  // salida 5:00pm / actividades no diarias, según necesidad). Interpretación propia
  // sin confirmar con Miguel: "coser pastas... el codo, espagueti, se cuecen medio
  // paquete" se leyó como medio paquete para cada una (codo y espagueti por separado).
  cocina: [
    ['Registro de llegada', 'baja', false, null, null, null],
    ['Contabilizar inventario de vegetales', 'alta', false, null, null, null],
    ['Revisar sobrantes (no se vuelve a producir si sobra)', 'media', false, null, null, null],
    ['Revisar calidad de guisados y preparaciones', 'alta', false, null, null, null],
    ['Arroz blanco producido', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Arroz rojo producido', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Adobo tradicional hervido', 'alta', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Nopales cocidos', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Puré de papa preparado', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Papa cambray cocida', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Espagueti cocido', 'media', true, 'paquetes', 'PRODUCCIÓN', 'medio paquete'],
    ['Ensalada de col con zanahoria preparada', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Crema para espagueti preparada', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Guisados de apertura listos', 'alta', false, null, 'PUNTUALIDAD', 'antes de 10:00 a.m.'],
    ['Comida de empleados preparada', 'baja', false, null, null, null],
    ['Codo (pasta) cocido', 'media', true, 'paquetes', 'PRODUCCIÓN', 'medio paquete'],
    ['Papa gajo cocida', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Adobo tradicional molido', 'media', false, null, 'PRODUCCIÓN', 'según necesidad del día'],
    ['Cebolla fileteada', 'media', true, 'kg', 'PRODUCCIÓN', '2 kg'],
    ['Guajillo cocido para adobo tradicional', 'media', false, null, 'PRODUCCIÓN', '= orden de producción del día'],
    ['Orden de producción generada con supervisión', 'alta', false, null, 'EVIDENCIA', '100% diario, validada con supervisión'],
    ['Orden de compra generada', 'alta', false, null, 'EVIDENCIA', '100% diario'],
    ['Hacer pedido de Peregrina', 'media', false, null, null, null],
    ['Hoja de pedido para Rastro', 'alta', false, null, null, null],
    ['Limpieza de mesa de trabajo, barras, caja y trapos', 'media', false, null, 'LIMPIEZA', '100% diario'],
    ['Pase de salida generado', 'critica', false, null, 'PUNTUALIDAD', '5:00 p.m.'],
    ['Producción ajustada a la orden del día', 'alta', false, null, 'EXCEPCIÓN', '0 desviaciones'],
    ['Marinado de pollo rostizado producido', 'alta', false, null, 'FRECUENCIA', 'según necesidad (no diario)'],
    ['Adobo de tres chiles producido', 'media', false, null, 'FRECUENCIA', 'según necesidad (no diario)'],
    ['Salsa BBQ producida', 'media', false, null, 'FRECUENCIA', 'según necesidad (no diario)'],
    ['Salsa chipotle producida', 'media', false, null, 'FRECUENCIA', 'según necesidad (no diario)'],
    ['Adobo de salsa chipotle producido', 'media', false, null, 'FRECUENCIA', 'según necesidad (no diario)'],
    ['Costilla marinada y porcionada', 'media', false, null, 'FRECUENCIA', 'según necesidad (no diario)'],
    ['Ajo picado y preparado en aceite', 'media', true, 'kg', 'PRODUCCIÓN', '≈15 kg, según necesidad'],
    ['Producir abastecimiento de barras', 'media', false, null, null, null],
    ['Preparar verdura para el día siguiente', 'media', false, null, null, null],
  ],
  // --- Rosticero: marco de 11 tipos (7 sep 2026) ---
  // Reescrito a partir de la transcripción de audio de Nancy/equipo del mismo día,
  // en el orden del audio (llegada / horno y embarillado / calentar costilla-adobos-
  // papas / limpieza y acomodo / despacho e insumos / conteo de crudo / durante el
  // día / cierre). Interpretación propia sin confirmar con Miguel: "máximo 30 minutos
  // de 20" en el embarillado se leyó como el mismo patrón mín/máx de piezas que el
  // horno (20-30 piezas), no como una duración — "minutos" probablemente es error de
  // transcripción de audio por "mínimo".
  rosticero: [
    ['Hora de llegada (tolerancia máx 10 min sobre hora de entrada)', 'media', false, null, 'PUNTUALIDAD', 'tolerancia máx 10 min'],
    ['Pollo metido al horno', 'critica', true, 'piezas', 'PRODUCCIÓN', '20–30 piezas'],
    ['Pollo embarillado', 'critica', true, 'piezas', 'PRODUCCIÓN', '20–30 piezas (ajustable en fechas especiales: Navidad, Día de las Madres)'],
    ['Revisar pollo anterior (primero en salir, FIFO)', 'media', false, null, 'PROCESO', '0 incidentes'],
    ['Costilla, pollo anterior, adobos y papas cambray calentados/metidos al horno', 'media', false, null, 'PROCESO', '4/4'],
    ['Limpieza de barras y áreas en general', 'media', false, null, 'LIMPIEZA', '100%'],
    ['Productos acomodados en las áreas', 'media', false, null, 'PROCESO', '100%'],
    ['Contabilizar pollo rostizado y anotar en corte del día', 'critica', true, 'piezas', null, null],
    ['Guardar pollo en refrigeración sin excepción', 'alta', false, null, null, null],
    ['Pollo listo para despachar', 'critica', true, 'piezas', 'INSUMO', '20–40 piezas'],
    ['Arroz embolsado para despacho', 'media', true, 'kg', 'INSUMO', '2 kg embolsados'],
    ['Salsa en contenedores para despacho', 'media', true, 'contenedores', 'INSUMO', '15 contenedores'],
    ['Plásticos/empaques suficientes para despacho', 'baja', false, null, 'INSUMO', 'suficiente'],
    ['Pollo crudo contabilizado para el resto del día', 'critica', true, 'piezas', 'INSUMO', 'mínimo 30 piezas'],
    ['Mínimos de pollo y arroz sostenidos durante el día', 'alta', false, null, 'INSUMO', '100% del día'],
    ['Áreas limpias y organizadas todo el día', 'media', false, null, 'LIMPIEZA', '100% todo el día'],
    ['Contabilizar pollo rostizado crudo antes de salir (con firma)', 'critica', true, 'piezas', null, null],
    ['Pase de salida generado con área ordenada y limpia', 'critica', false, null, 'EVIDENCIA', '100%'],
  ],
  // --- Freidoras: piloto del marco de 11 tipos (2 sep 2026) ---
  // Reescrito a partir de la transcripción de audio de Nancy/equipo del mismo día,
  // organizado en 3 bloques (Apertura / Durante el día / Cierre) que colapsan a una
  // sola lista ordenada aquí porque la app no tiene sub-secciones dentro de un área.
  // Se conservan sin reclasificar (indicatorType/target = null) los 3 renglones que
  // ese audio no cubrió: Registro de llegada, Contabilizar con barras, y el resto de
  // complementos (elote/jamón/crema — "codo" ya salió de ahí porque sí vino en el audio).
  freidoras: [
    ['Registro de llegada', 'baja', false, null, null, null],
    ['Freidoras operativas a tiempo (arranque antes de 7:30am)', 'alta', false, null, 'PUNTUALIDAD', '7:30 a.m.'],
    ['Aceite del turno anterior filtrado antes de encender equipo', 'media', false, null, 'PROCESO', '100%'],
    ['Equipo de arranque conectado (horno, refrigerador, freidora, gas general)', 'alta', false, null, 'PROCESO', '4/4'],
    ['Ensalada campesina lista según orden de producción', 'media', true, 'porciones', 'PRODUCCIÓN', '= orden de producción del día'],
    ['Pollo crujiente listo según orden de producción', 'critica', true, 'piezas', 'PRODUCCIÓN', '= orden de producción del día'],
    ['Salsa verde lista (nueva o reutilizada según orden)', 'media', true, 'litros', 'PROCESO', '= orden de producción del día'],
    ['Papas gajo listas según orden de producción', 'media', true, 'kg', 'PRODUCCIÓN', '= orden de producción del día'],
    ['Ensalada de codo lista según orden de producción', 'media', true, 'kg', 'PRODUCCIÓN', '= orden de producción del día'],
    ['Sin quiebre de stock (crujiente, campesina, papas gajo, salsa verde, codo)', 'critica', false, null, 'EXCEPCIÓN', '0 incidentes'],
    ['Rendimiento de corte de zanahoria', 'baja', true, 'kg', 'INSUMO', '≈ 2.5 kg'],
    ['Rendimiento de corte de brócoli', 'baja', true, 'kg', 'INSUMO', '≈ 5 kg'],
    ['Brócoli desinfectado en agua durante producción', 'media', false, null, 'PROCESO', '100%'],
    ['Brócoli escurrido y refrigerado al cierre', 'media', false, null, 'PROCESO', '100%'],
    ['Stock de jalapeño en refrigeración', 'media', true, 'kg', 'INSUMO', 'bote de 2.9 kg disponible, no vacío'],
    ['Control de apertura de latas de jalapeño (no abrir nueva sin vaciar la anterior)', 'alta', false, null, 'EXCEPCIÓN', '0 incidentes'],
    ['Porción de jalapeño preparado disponible', 'baja', false, null, 'INSUMO', 'mínimo por definir'],
    ['Porción de perejil limpio disponible', 'baja', false, null, 'INSUMO', 'mínimo por definir'],
    ['Porción de morrón limpio disponible', 'baja', false, null, 'INSUMO', 'mínimo por definir'],
    ['Contabilizar con barras', 'alta', false, null, null, null],
    ['Abastecimiento de complementos (elote, jamón, crema)', 'media', false, null, null, null],
    ['Conteo de pollo cuadra contra producción/venta (control de merma)', 'critica', true, 'piezas', 'CALIDAD', 'variación = 0'],
    ['Conteo de sobrante por vegetal (brócoli, morrón, jalapeño, zanahoria, papa gajo)', 'media', false, null, 'INSUMO', '100% registrado'],
    ['Mesa de trabajo limpia', 'baja', false, null, 'LIMPIEZA', '100%'],
    ['Freidora lavada (cuando aplica)', 'media', false, null, 'LIMPIEZA', 'según necesidad del día'],
    ['Cierre del turno registrado en la orden de producción (para el día siguiente)', 'alta', false, null, 'EVIDENCIA', '100%'],
  ],
  // --- Caja: marco de 11 tipos (7 sep 2026) ---
  // Reescrito a partir de la transcripción de audio de Nancy/equipo del mismo día.
  // "Ofrecer promociones (grupos de WhatsApp)" se dejó separada de "Productos
  // ofrecidos activamente durante el día" (venta en piso) por ser dos canales
  // distintos — confirmar con Miguel si en realidad son la misma actividad.
  caja: [
    ['Llegada a tiempo con uniforme completo', 'media', false, null, 'PUNTUALIDAD', 'tolerancia máx 5 min'],
    ['Cambio completo (billetes, monedas, caja chica, denominaciones)', 'critica', true, 'pesos', 'INSUMO', '$3,000 billetes + $3,000 monedas, caja chica completa'],
    ['Rollos de impresora suficientes', 'media', false, null, 'INSUMO', 'suficientes'],
    ['Limpieza de caja, barra caliente, lonas, acrílico y bote de basura', 'media', false, null, 'LIMPIEZA', '100%'],
    ['Teléfono cargado y teléfono fijo limpio', 'baja', false, null, 'PROCESO', '2/2'],
    ['Producto suficiente para venta en caja (arroz y complementos)', 'media', false, null, 'INSUMO', 'suficiente'],
    ['Barra caliente con calidad Chicanito (hidratada y abastecida)', 'alta', false, null, 'CALIDAD', 'hidratada y abastecida'],
    ['Organizar área de trabajo', 'baja', false, null, null, null],
    ['Mantener publicidad/promociones visibles', 'baja', false, null, null, null],
    ['Ofrecer promociones (grupos de WhatsApp)', 'media', false, null, null, null],
    ['Productos ofrecidos activamente durante el día', 'media', false, null, 'FRECUENCIA', 'constante durante el día'],
    ['Atención al cliente amable y constante', 'media', false, null, 'CALIDAD', 'trato amable constante'],
    ['Ventiladores anti-moscas funcionando (mínimo 2 por barra, pilas cargadas a diario)', 'critica', true, 'piezas', 'PROCESO', 'mínimo 2/barra, pilas cargadas a diario'],
    ['Hoja final de cierre enviada (con cobros de tarjeta)', 'critica', false, null, 'EVIDENCIA', '100%'],
    ['Ayudar a cerrar el establecimiento', 'media', false, null, null, null],
  ],
  ventas_barras: [
    ['Registro de llegada', 'baja', false, null],
    ['Organizar barras para arranque', 'media', false, null],
    ['Envasar arroz, salsa BBQ y verde', 'media', false, null],
    ['Pedir productos cuando se requiera', 'media', false, null],
    ['Mantener productos hidratados todo el día', 'media', false, null],
    ['Atención al cliente según estándares Chicanito', 'media', false, null],
    ['Ofrecer promociones y ensaladas', 'baja', false, null],
    ['Limpieza de vidrios (todo el día)', 'baja', false, null],
    ['Bajar productos a partir de las 5pm', 'media', false, null],
    ['Apagar barra caliente y fría', 'media', false, null],
    ['Inventario de productos (ensaladas y proteína, desde 6:30pm)', 'alta', false, null],
    ['Limpieza de barra principal', 'baja', false, null],
    ['Organizar barras con insertos', 'baja', false, null],
  ],
  trastes: [
    ['Registro de llegada', 'baja', false, null],
    ['Lavado de trastes', 'media', false, null],
    ['Mantener área de tarja limpia', 'media', false, null],
    ['Jabón y cloro suficiente', 'baja', false, null],
    ['Limpieza de refrigeradores', 'baja', false, null],
    ['Mantener pisos limpios', 'baja', false, null],
    ['Acomodar todos los trastes', 'baja', false, null],
  ],
  supervision: [
    ['9:00am — Llegada del supervisor, revisar pendientes del día anterior', 'media', false, null],
    ['9:15am — Supervisión de llegada del personal (asistencia, uniformes)', 'media', false, null],
    ['9:30am — Envío de reporte de apertura al grupo', 'media', false, null],
    ['10:00am — Revisión de inventario inicial', 'critica', false, null],
    ['10:30am — Inspección de áreas de trabajo', 'alta', false, null],
    ['11:00am — Evaluación de calidad de guisados/preparaciones', 'media', false, null],
    ['11:30am — Revisión de producción (crujiente, adobos, guarniciones)', 'alta', false, null],
    ['12:00pm — Supervisión de barras (hidratación, cantidad suficiente)', 'media', false, null],
    ['1:00pm — Monitoreo de flujo de clientes', 'baja', false, null],
    ['2:00pm — Preparación para hora pico', 'media', false, null],
    ['3:00pm — Control de caja (ventas, promociones, lealtad)', 'alta', false, null],
    ['4:00pm — Gestión de inventario intermedio', 'critica', false, null],
    ['5:00pm — Supervisión de bajada de productos', 'media', false, null],
    ['6:00pm — Revisión de limpieza profunda', 'media', false, null],
    ['6:30pm — Control de inventario final (conteo de proteínas)', 'critica', false, null],
    ['7:00pm — Cierre del local (caja, cuadres, cambio, evidencias)', 'critica', false, null],
    ['7:15pm — Inspección final del local', 'media', false, null],
    ['7:30pm — Envío de reporte de cierre (ventas, incidencias, inventario)', 'critica', false, null],
    ['Arqueo diario ágil (recepción, almacén, venta)', 'critica', false, null],
  ],
  moto_recepcion: [
    ['Hora real de llegada del socio operativo', 'media', false, 'hora'],
    ['Pollo Chicanito entregado', 'critica', true, 'piezas'],
    ['Salsas entregadas (verde/BBQ/mango habanero)', 'media', true, 'porciones'],
    ['Adobo entregado', 'media', true, 'porciones'],
    ['Arroz entregado', 'media', true, 'kg'],
    ['Empaque/desechables entregados (bolsas, charolas, servilletas)', 'baja', true, 'unidades'],
    ['Gasolina suficiente para el día', 'critica', false, null],
    ['Sin pendiente de mantenimiento antes de salir', 'critica', false, null],
    ['Punto de venta asignado del día confirmado', 'media', false, null],
    ['Hora de salida', 'baja', false, 'hora'],
  ],
  moto_cierre: [
    ['Hora real de regreso', 'media', false, 'hora'],
    ['Venta del día (efectivo/reportado)', 'critica', true, 'pesos'],
    ['Pollo Chicanito sobrante', 'critica', true, 'piezas'],
    ['Salsas sobrantes', 'baja', true, 'porciones'],
    ['Adobo sobrante', 'baja', true, 'porciones'],
    ['Arroz sobrante', 'baja', true, 'kg'],
    ['VERIFICACIÓN CRUZADA: sobrante + vendido = recibido en la mañana', 'critica', false, null],
    ['Limpieza del carrito/moto', 'media', false, null],
    ['Gasolina lista para el día siguiente', 'media', false, null],
    ['Sin nuevo tema de mantenimiento (o reportado)', 'critica', false, null],
    ['Entrega de efectivo / corte completo', 'critica', false, null],
  ],
};

// Catálogo semilla — empleados para Asistencia (área nueva, 7 sep 2026). Tomado de la
// nómina semanal en papel de Chicanito. Asistencia vive en tablas separadas
// (employees / attendance_checks) en vez de SEED_ACTIVITIES / activities porque cada
// persona necesita 4 marcas de hora por día (entrada, comida-salida, comida-regreso,
// salida), no un solo check ✓/✗ como el resto de las áreas.
const SEED_EMPLOYEES = [
  'Ana Lira',
  'Perla Estrada',
  'Maricruz Jiménez',
  'Gina Flores',
  'Keylar Flores',
  'Nohemí Barrera',
  'Julissa Mendoza',
  'Mauricio Salgado',
  'Herman Melo',
  'Rocío Mata',
  'Eliseo Barreto',
  'Nancy Rentería',
  'Yerely Leyva Díaz',
];

// Catálogo semilla — inventario (~30 SKUs, categorías reales mencionadas por Miguel).
// Punto de partida razonable — Nancy/Miguel deben afinar cantidades objetivo y unidades exactas.
const SEED_INVENTORY_ITEMS = [
  ['POL-001', 'Pollo (pieza/entero)', 'proteina', 'pieza'],
  ['VER-001', 'Jitomate', 'verdura_fresca', 'kg'],
  ['VER-002', 'Cebolla', 'verdura_fresca', 'kg'],
  ['VER-003', 'Chile jalapeño', 'verdura_fresca', 'kg'],
  ['VER-004', 'Chile guajillo', 'verdura_fresca', 'kg'],
  ['VER-005', 'Nopales', 'verdura_fresca', 'kg'],
  ['VER-006', 'Zanahoria', 'verdura_fresca', 'kg'],
  ['VER-007', 'Papa alfa', 'verdura_fresca', 'kg'],
  ['VER-008', 'Papa cambray', 'verdura_fresca', 'kg'],
  ['VER-009', 'Ajo', 'verdura_fresca', 'kg'],
  ['VER-010', 'Brócoli', 'verdura_fresca', 'kg'],
  ['SEC-001', 'Arroz', 'secos', 'kg'],
  ['SEC-002', 'Harina para crujientes', 'secos', 'kg'],
  ['SEC-003', 'Hielo', 'secos', 'kg'],
  ['SEC-004', 'Agua de garrafón', 'secos', 'garrafón'],
  ['COND-001', 'Sal', 'condimentos', 'kg'],
  ['COND-002', 'Pimienta', 'condimentos', 'kg'],
  ['COND-003', 'Aceite', 'condimentos', 'litro'],
  ['COND-004', 'Salsa BBQ (insumo)', 'condimentos', 'litro'],
  ['COND-005', 'Salsa verde (insumo)', 'condimentos', 'litro'],
  ['COND-006', 'Adobo tradicional', 'condimentos', 'kg'],
  ['COND-007', 'Adobo 3 chiles', 'condimentos', 'kg'],
  ['COND-008', 'Adobo mango habanero', 'condimentos', 'kg'],
  ['COND-009', 'Crema', 'condimentos', 'litro'],
  ['DESE-001', 'Bolsas de empaque', 'desechables', 'paquete'],
  ['DESE-002', 'Charolas de servicio', 'desechables', 'paquete'],
  ['DESE-003', 'Servilletas', 'desechables', 'paquete'],
  ['DESE-004', 'Vasos', 'desechables', 'paquete'],
  ['DESE-005', 'Contenedores para salsas', 'desechables', 'paquete'],
  ['DESE-006', 'Guantes', 'desechables', 'caja'],
];

async function ensureTables() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS areas (
      id SERIAL PRIMARY KEY,
      location_type TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      order_index INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      area_id INT NOT NULL REFERENCES areas(id),
      name TEXT NOT NULL,
      criticality TEXT NOT NULL DEFAULT 'media',
      weight INT NOT NULL DEFAULT 3,
      requires_quantity BOOLEAN NOT NULL DEFAULT false,
      unit TEXT,
      indicator_type TEXT,
      target TEXT,
      order_index INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true
    )
  `;

  // Migración idempotente para bases ya creadas antes del 2 sep 2026 (piloto de
  // Freidoras): activities ya existía sin indicator_type/target. ADD COLUMN IF NOT
  // EXISTS no rompe nada si ya corrieron — y en una base nueva el CREATE TABLE de
  // arriba ya las trae, así que esto es un no-op.
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS indicator_type TEXT`;
  await sql`ALTER TABLE activities ADD COLUMN IF NOT EXISTS target TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS activity_checks (
      id SERIAL PRIMARY KEY,
      activity_id INT NOT NULL REFERENCES activities(id),
      location_id INT NOT NULL REFERENCES locations(id),
      check_date DATE NOT NULL,
      done BOOLEAN NOT NULL DEFAULT false,
      quantity NUMERIC,
      quality_score INT,
      notes TEXT,
      checked_by TEXT NOT NULL,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(activity_id, location_id, check_date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      item_id INT NOT NULL REFERENCES inventory_items(id),
      location_id INT NOT NULL REFERENCES locations(id),
      movement_type TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      movement_date DATE NOT NULL,
      notes TEXT,
      recorded_by TEXT NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_sales (
      id SERIAL PRIMARY KEY,
      location_id INT REFERENCES locations(id),
      item_name TEXT NOT NULL,
      quantity NUMERIC NOT NULL,
      amount NUMERIC,
      sale_date DATE NOT NULL,
      source TEXT NOT NULL DEFAULT 'poster',
      imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // --- Asistencia (7 sep 2026): tablas propias, separadas de activities/activity_checks ---
  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      order_index INT NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance_checks (
      id SERIAL PRIMARY KEY,
      employee_id INT NOT NULL REFERENCES employees(id),
      location_id INT NOT NULL REFERENCES locations(id),
      check_date DATE NOT NULL,
      entrada TIMESTAMPTZ,
      comida_salida TIMESTAMPTZ,
      comida_regreso TIMESTAMPTZ,
      salida TIMESTAMPTZ,
      recorded_by TEXT,
      UNIQUE(employee_id, location_id, check_date)
    )
  `;

  // --- Seed: solo inserta si la tabla de locations está vacía (primera vez) ---
  const existing = await sql`SELECT COUNT(*)::int AS n FROM locations`;
  if (existing[0].n === 0) {
    for (const loc of SEED_LOCATIONS) {
      await sql`INSERT INTO locations (code, name, type) VALUES (${loc.code}, ${loc.name}, ${loc.type})
        ON CONFLICT (code) DO NOTHING`;
    }
    for (const area of SEED_AREAS) {
      await sql`INSERT INTO areas (code, name, location_type, order_index) VALUES
        (${area.code}, ${area.name}, ${area.location_type}, ${area.order_index})
        ON CONFLICT (code) DO NOTHING`;
    }
    const areaRows = await sql`SELECT id, code FROM areas`;
    const areaIdByCode = Object.fromEntries(areaRows.map(r => [r.code, r.id]));

    for (const [areaCode, acts] of Object.entries(SEED_ACTIVITIES)) {
      const areaId = areaIdByCode[areaCode];
      if (!areaId) continue;
      let orderIndex = 0;
      for (const [name, criticality, requiresQuantity, unit, indicatorType, target] of acts) {
        orderIndex += 1;
        const weight = CRITICALITY_WEIGHT[criticality] || 3;
        await sql`INSERT INTO activities (area_id, name, criticality, weight, requires_quantity, unit, indicator_type, target, order_index)
          VALUES (${areaId}, ${name}, ${criticality}, ${weight}, ${requiresQuantity}, ${unit}, ${indicatorType ?? null}, ${target ?? null}, ${orderIndex})`;
      }
    }

    for (const [sku, name, category, unit] of SEED_INVENTORY_ITEMS) {
      await sql`INSERT INTO inventory_items (sku, name, category, unit) VALUES (${sku}, ${name}, ${category}, ${unit})
        ON CONFLICT (sku) DO NOTHING`;
    }
  }

  // --- Seed de empleados: gate propio, independiente del de locations arriba ---
  const existingEmployees = await sql`SELECT COUNT(*)::int AS n FROM employees`;
  if (existingEmployees[0].n === 0) {
    let orderIndex = 0;
    for (const name of SEED_EMPLOYEES) {
      orderIndex += 1;
      await sql`INSERT INTO employees (name, order_index) VALUES (${name}, ${orderIndex})
        ON CONFLICT (name) DO NOTHING`;
    }
  }

  return sql;
}

module.exports = { getSql, ensureTables, CRITICALITY_WEIGHT, SEED_ACTIVITIES };
