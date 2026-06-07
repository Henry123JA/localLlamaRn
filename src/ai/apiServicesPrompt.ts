import type {ChatMessage} from './llamaService';
import type {PlannedAction} from './api/types';
import {
  buildPlannerActionsDescriptionForPrompt,
  getActionByKey,
} from './api/modules';

export type {PlannedAction};

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

export function buildPlannerPrompt(): ChatMessage {
  return {
    role: 'system',
    content: `
Eres un planner de acciones API.

Convierte la orden del usuario a JSON.
Responde solo JSON válido. Sin markdown. Sin explicación.

Formato:
{
  "type": "action_plan",
  "items": [
    {
      "step": 1,
      "status": "ok",
      "action_key": "cliente.create"
    }
  ]
}

Acciones disponibles:
${buildPlannerActionsDescriptionForPrompt()}

Reglas:
- Usa "ok" solo si la acción pedida existe.
- Usa "unsupported" si la acción pedida no existe.
- Si status es "ok", action_key debe ser una acción disponible.
- Si status es "unsupported", action_key debe ser "unsupported".
- No cambies la intención del usuario para hacerla válida.
- No inventes acciones extra.
- "producto" o "productos" significa inventario.
- "stock" significa inventario.
- Si hay varias acciones, crea varios items en el mismo orden.

Tolerancia a errores:
- Interpreta errores ortográficos leves del usuario.
- Interpreta palabras mal escritas si son parecidas a una acción o módulo conocido.
- "creap", "crar", "creaer" significan crear.
- "lsta", "lsita", "list", "listarrr" significan listar.
- "elminar", "elimnar", "borrarrr", "delete" significan eliminar.
- "clietne", "cleinte", "client" significan cliente.
- "prodcto", "prodcuto", "producto" significan inventario.
- "comrpa", "compa", "compras" significan compra.
- "vnta", "benta", "ventas" significan venta.
- Si el error es entendible, devuelve la action_key correcta.
- Si el texto es demasiado ambiguo, usa status "unsupported".
`.trim(),
  };
}

export function buildSingleActionPrompt(action: PlannedAction): ChatMessage {
  const actionData = getActionByKey(`${action.module}.${action.operation}`);

  const moduleSchema = actionData?.moduleSchema;
  const operationSchema = actionData?.operationSchema;

  const fieldsText =
    operationSchema && operationSchema.bodyFields.length > 0
      ? operationSchema.bodyFields
          .map(field => `${field.name}: ${field.type}`)
          .join(', ')
      : '{}';

  return {
    role: 'system',
    content: `
Eres un generador de JSON API Services.
Genera JSON para una sola acción.
Responde solo JSON válido. Sin markdown. Sin explicación.

Datos:
step: ${action.step}
module: ${moduleSchema?.module}
operation: ${operationSchema?.operation}
method: ${operationSchema?.method}
path: ${operationSchema?.path}
requiresId: ${operationSchema?.requiresId ? 'true' : 'false'}
bodyFields: ${fieldsText}

Reglas:
- Devuelve type "api_services".
- Devuelve exactamente una acción en actions.
- Usa method y path indicados.
- Si path tiene :id, reemplázalo por un número inventado y pon params {"id": id}.
- Si hay bodyFields, inventa valores realistas.
- Si no hay bodyFields, body debe ser {}.
- Emails inventados deben usar @example.com.
`.trim(),
  };
}


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

Usuario:
${userMessage}
`;
}
