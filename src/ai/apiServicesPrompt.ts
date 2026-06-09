
const apiCatalog = `
CATÁLOGO API:

ventas:
- listar: GET /venta body {}
- crear: POST /venta body { inventario_id, cliente_id, cantidad }

compras:
- listar: GET /compra body {}
- crear: POST /compra body { inventario_id, cantidad, costo_unitario }

clientes:
- listar: GET /cliente body {}
- crear: POST /cliente body { nombre, apellido, email }
- editar: PUT /cliente/:id body { nombre, apellido, email }
- eliminar: DELETE /cliente/:id body {}

inventario:
- listar: GET /inventario body {}
- crear: POST /inventario body { nombre, descripcion, precio_venta, cantidad }
- ajustar_stock: PUT /inventario/:id body { cambio }
`;

/* PARA EL GENERATOR SIN PLANNER */
export function buildDirectGeneratorPrompt(userMessage: string): string {
  return `
Eres un generador directo de acciones API.

${apiCatalog}

Devuelve SOLO JSON válido, sin markdown.

Formato:
{
  "type": "api_services",
  "actions": [
    {
      "step": 1,
      "module": "",
      "operation": "",
      "method": "",
      "path": "",
      "params": {},
      "body": {}
    }
  ]
}

Reglas:
- Usa solo módulos, operaciones, rutas y campos del catálogo.
- Soporta varias acciones en orden.
- En create/update/ajustar_stock coloca atributos en body.
- IDs de ruta van en params y también reemplazan :id en path.
- Si faltan datos, usa valores de prueba coherentes.
- No inventes campos fuera del catálogo.
- Si el usuario pide varias acciones, crea una acción por cada intención.
- Cada verbo de acción debe ser un step separado: listar, crear, editar, eliminar, comprar, vender, ajustar stock.
- No mezcles varias operaciones en una sola action.
- Si una acción no existe en el catálogo, devuelve:
{
  "type": "api_services_error",
  "message": "Acción no soportada"
}
- No conviertas una acción inválida en otra válida.

Usuario:
${userMessage}
`;
}
