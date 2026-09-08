import json

LOCATIONS = [
    {"id": 1, "code": "jojutla", "name": "Sucursal Jojutla", "type": "tienda"},
    {"id": 2, "code": "moto-1", "name": "Chicanito Móvil 1", "type": "moto"},
    {"id": 3, "code": "moto-2", "name": "Chicanito Móvil 2", "type": "moto"},
]

AREAS = [
    {
        "id": 10, "code": "rastro", "name": "Rastro", "order_index": 1,
        "activities": [
            {"id": 100, "area_id": 10, "name": "Pollo con hielo suficiente", "criticality": "alta", "weight": 6, "requires_quantity": False, "unit": None, "order_index": 1},
            {"id": 101, "area_id": 10, "name": "Compra de hielo", "criticality": "media", "weight": 3, "requires_quantity": False, "unit": None, "order_index": 2},
            {"id": 102, "area_id": 10, "name": "Pollo rostizado preparado", "criticality": "critica", "weight": 10, "requires_quantity": True, "unit": "piezas", "order_index": 3},
        ],
    },
    {
        "id": 11, "code": "cocina", "name": "Cocina", "order_index": 2,
        "activities": [
            {"id": 110, "area_id": 11, "name": "Registro de llegada", "criticality": "baja", "weight": 1, "requires_quantity": False, "unit": None, "order_index": 1},
            {"id": 111, "area_id": 11, "name": "Contabilizar inventario de vegetales", "criticality": "alta", "weight": 6, "requires_quantity": False, "unit": None, "order_index": 2},
        ],
    },
    {
        "id": 12, "code": "caja", "name": "Caja", "order_index": 3,
        "activities": [
            {"id": 120, "area_id": 12, "name": "Tener cambio suficiente", "criticality": "critica", "weight": 10, "requires_quantity": True, "unit": "pesos", "order_index": 1},
            {"id": 121, "area_id": 12, "name": "Limpieza de caja", "criticality": "media", "weight": 3, "requires_quantity": False, "unit": None, "order_index": 2},
        ],
    },
]

# Checks: dejamos "Tener cambio suficiente" (critica) SIN marcar para forzar
# el banner de pendientes criticos + chip rojo. El resto parcialmente marcado.
CHECKS = [
    {"activity_id": 100, "done": True, "quantity": None, "quality_score": 90, "notes": None, "checked_by": "Nancy", "checked_at": "2026-08-26T14:00:00Z"},
    {"activity_id": 101, "done": True, "quantity": None, "quality_score": None, "notes": None, "checked_by": "Nancy", "checked_at": "2026-08-26T14:05:00Z"},
    {"activity_id": 110, "done": True, "quantity": None, "quality_score": None, "notes": None, "checked_by": "Nancy", "checked_at": "2026-08-26T09:00:00Z"},
    {"activity_id": 121, "done": True, "quantity": None, "quality_score": None, "notes": None, "checked_by": "Nancy", "checked_at": "2026-08-26T18:00:00Z"},
]

CRITICALITY_WEIGHT = {"baja": 1, "media": 3, "alta": 6, "critica": 10}


def build_summary():
    checks_by_id = {c["activity_id"]: c for c in CHECKS}
    area_map = {}
    total_weight = 0
    done_weight = 0
    critical_pending = []
    for area in AREAS:
        a = area_map.setdefault(area["code"], {"area_code": area["code"], "area_name": area["name"], "total_weight": 0, "done_weight": 0, "total_items": 0, "done_items": 0})
        for act in area["activities"]:
            c = checks_by_id.get(act["id"])
            done = bool(c and c["done"])
            total_weight += act["weight"]
            if done:
                done_weight += act["weight"]
            if not done and act["criticality"] == "critica":
                critical_pending.append({"area_name": area["name"], "name": act["name"]})
            a["total_weight"] += act["weight"]
            a["total_items"] += 1
            if done:
                a["done_weight"] += act["weight"]
                a["done_items"] += 1
    areas_out = []
    for a in area_map.values():
        score = round((a["done_weight"] / a["total_weight"]) * 100) if a["total_weight"] else 0
        areas_out.append({**a, "score": score})
    overall = round((done_weight / total_weight) * 100) if total_weight else 0
    return {
        "location": LOCATIONS[0],
        "date": "2026-08-26",
        "overall_score": overall,
        "areas": areas_out,
        "critical_pending": critical_pending,
        "cross_check": None,
    }


MOVEMENTS = [
    {"id": 1, "item_id": 1, "item_name": "Pollo (pieza/entero)", "unit": "pieza", "location_id": 1, "movement_type": "recepcion", "quantity": 40, "movement_date": "2026-08-26", "notes": None, "recorded_by": "Nancy", "recorded_at": "2026-08-26T09:10:00Z"},
    {"id": 2, "item_id": 2, "item_name": "Jitomate", "unit": "kg", "location_id": 1, "movement_type": "merma", "quantity": 2, "movement_date": "2026-08-26", "notes": "golpeado", "recorded_by": "Nancy", "recorded_at": "2026-08-26T12:30:00Z"},
]

if __name__ == "__main__":
    print(json.dumps(build_summary(), indent=2, ensure_ascii=False))
