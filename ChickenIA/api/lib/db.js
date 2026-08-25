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
  { code: 'jojutla', name: 'Sucursal Jojutla', type: 'tienda' },
  { code: 'moto-1', name: 'Moto Chicanito 1', type: 'moto' },
  { code: 'moto-2', name: 'Moto Chicanito 2', type: 'moto' },
  { code: 'moto-3', name: 'Moto Chicanito 3', type: 'moto' },
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
const SEED_ACTIVITIES = {
  rastro: [
    ['Pollo con hielo suficiente', 'alta', false, null],
    ['Compra de hielo', 'media', false, null],
    ['Refrigerado de legumbres organizado y limpio', 'media', false, null],
    ['Porciones de nopales', 'baja', true, 'porciones'],
    ['Compra de agua de garrafón', 'baja', false, null],
    ['Harina para crujientes', 'media', true, 'kg'],
    ['Papas cambray (cantidad disponible)', 'media', true, 'kg'],
    ['Papa alfa sin procesar (cantidad)', 'media', true, 'kg'],
    ['Papa alfa procesada (cantidad)', 'media', true, 'kg'],
    ['Marinado para pollo rostizado (solicitar 3-4 días antes)', 'alta', false, null],
    ['Conservar vegetales organizados por fecha de compra', 'media', false, null],
    ['Arroz para bulto (kg disponibles)', 'media', true, 'kg'],
    ['Pollo rostizado preparado (cantidad lista)', 'critica', true, 'piezas'],
    ['Paneles solares encendidos y limpios (cada 15 días)', 'baja', false, null],
    ['Pollo crujiente preparado (cantidad lista)', 'critica', true, 'piezas'],
    ['Limpieza general (refris, pisos, cajas, trapos, mesas, baño)', 'media', false, null],
    ['Limpieza de camioneta', 'baja', false, null],
    ['Registro de gastos de rastro', 'media', true, 'pesos'],
    ['Compra de gasolina (foto de recibo)', 'media', true, 'pesos'],
    ['Chile jalapeño (cantidad disponible)', 'baja', true, 'kg'],
  ],
  cocina: [
    ['Registro de llegada', 'baja', false, null],
    ['Contabilizar inventario de vegetales', 'alta', false, null],
    ['Revisar sobrantes (no se vuelve a producir si sobra)', 'media', false, null],
    ['Revisar calidad de guisados y preparaciones', 'alta', false, null],
    ['Cocer papa para campesina', 'media', false, null],
    ['Producir adobos (tradicional, BBQ, 3 chiles)', 'alta', false, null],
    ['Preparar crema, pastas y costilla', 'media', false, null],
    ['Producir abastecimiento de barras', 'media', false, null],
    ['Limpieza de área/estufa/mesa de trabajo/pisos/paredes', 'media', false, null],
    ['Preparar comida para empleados', 'baja', false, null],
    ['Moler adobo cuando sea necesario', 'media', false, null],
    ['Preparar verdura para el día siguiente', 'media', false, null],
    ['Hacer pedido de Peregrina', 'media', false, null],
    ['Hoja de pedido para Rastro', 'alta', false, null],
    ['Poner a cocer guajillo', 'baja', false, null],
    ['Revisar y comprar insumos faltantes', 'alta', false, null],
    ['Hoja de producción para el día siguiente', 'alta', false, null],
  ],
  rosticero: [
    ['Registro de llegada', 'baja', false, null],
    ['Contabilizar pollo rostizado y anotar en corte del día', 'critica', true, 'piezas'],
    ['Revisar pollo anterior (primero en embarillarse)', 'media', false, null],
    ['Guardar pollo en refrigeración sin excepción', 'alta', false, null],
    ['Meter pollo al horno (20-30, según día)', 'media', false, null],
    ['Embarillar 30-45 pollos (verificar con supervisor)', 'alta', true, 'piezas'],
    ['Limpieza total de pisos y barras', 'media', false, null],
    ['Organizar áreas de trabajo (máx 30 porciones)', 'media', false, null],
    ['Suficiente pollo y arroz hasta hora de salida', 'alta', false, null],
    ['Contabilizar pollo rostizado crudo antes de salir (con firma)', 'critica', true, 'piezas'],
    ['Mantener área limpia y organizada todo el día', 'baja', false, null],
    ['Pedir pase de salida (nunca irse sin autorización)', 'alta', false, null],
  ],
  freidoras: [
    ['Registro de llegada', 'baja', false, null],
    ['Contabilizar pollo crujiente', 'critica', true, 'piezas'],
    ['Revisar sobrantes (crujiente, salsa verde, campesina, papas, codo)', 'media', false, null],
    ['Preparación del crujiente (charolas, salsas, según orden)', 'alta', false, null],
    ['Limpieza de freidora', 'media', false, null],
    ['Contabilizar con barras', 'alta', false, null],
    ['Revisar insumos (papa alfa, harina, brócoli, zanahoria, chile)', 'media', false, null],
    ['Producción para barras durante el día', 'media', false, null],
    ['Abastecimiento de crujiente todo el día', 'alta', false, null],
    ['Abastecimiento de complementos (codo, elote, jamón, crema)', 'media', false, null],
    ['Limpieza de área (freidoras, mesa, refri, piso)', 'media', false, null],
  ],
  caja: [
    ['Registrar entrada (con evidencia)', 'baja', false, null],
    ['Organizar área de trabajo', 'baja', false, null],
    ['Mantener publicidad/promociones visibles', 'baja', false, null],
    ['Ofrecer promociones (grupos de WhatsApp)', 'media', false, null],
    ['Atención a cliente (Puntos Chicanitos)', 'media', false, null],
    ['Tener cambio suficiente ($3,000 billetes + $3,000 monedas)', 'critica', true, 'pesos'],
    ['Limpieza de caja, barra caliente y fría', 'media', false, null],
    ['Cierre de turno (evidencias por WhatsApp)', 'critica', false, null],
    ['Limpieza general (acrílicos, publicidad, mesas, sillas)', 'baja', false, null],
    ['Ayudar a cerrar el establecimiento', 'media', false, null],
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
      order_index INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true
    )
  `;

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
      for (const [name, criticality, requiresQuantity, unit] of acts) {
        orderIndex += 1;
        const weight = CRITICALITY_WEIGHT[criticality] || 3;
        await sql`INSERT INTO activities (area_id, name, criticality, weight, requires_quantity, unit, order_index)
          VALUES (${areaId}, ${name}, ${criticality}, ${weight}, ${requiresQuantity}, ${unit}, ${orderIndex})`;
      }
    }

    for (const [sku, name, category, unit] of SEED_INVENTORY_ITEMS) {
      await sql`INSERT INTO inventory_items (sku, name, category, unit) VALUES (${sku}, ${name}, ${category}, ${unit})
        ON CONFLICT (sku) DO NOTHING`;
    }
  }

  return sql;
}

module.exports = { getSql, ensureTables, CRITICALITY_WEIGHT };
