import type {ChatMessage} from './llamaService';
import type {PlannedAction} from './api/types';
import {
  buildModulesDescriptionForPrompt,
  getModuleByName,
} from './api/modules';

export type {PlannedAction};

export function buildPlannerPrompt(): ChatMessage {
  return {
    role: 'system',
    content: `
Eres un planner de acciones API.

Tu tarea es detectar acciones desde una orden en lenguaje natural.

Responde únicamente JSON válido.
No uses markdown.
No expliques nada.
No generes body.
No generes method.
No generes path.

Formato obligatorio:
{
  "type": "action_plan",
  "items": [
    {
      "step": 1,
      "status": "ok",
      "module": "cliente",
      "operation": "create",
      "message": ""
    }
  ]
}

Módulos y operaciones disponibles:
${buildModulesDescriptionForPrompt()}

Reglas:
- Si el usuario pide una acción válida, crea un item con status "ok".
- Si el usuario pide una operación que no existe para ese módulo, crea un item con status "unsupported".
- No cambies el módulo para forzar una operación válida.
- No cambies la operación para forzar una operación válida.
- No inventes acciones que el usuario no pidió.
- Si el usuario pide varias acciones, devuelve varios items.
- Cada item debe tener step empezando desde 1.
- Respeta el orden pedido por el usuario.
- Usa solo módulos existentes.
- En status "ok", message debe ser "".
- En status "unsupported", message debe explicar brevemente por qué no se soporta.

Interpretación de módulos:
- "producto" o "productos" se interpretan como módulo "inventario".
- "stock" se interpreta como módulo "inventario".
- "compra" o "compras" se interpretan como módulo "compra".
- "venta" o "ventas" se interpretan como módulo "venta".
- "cliente" o "clientes" se interpretan como módulo "cliente".

Ejemplos:

Usuario: crea producto
Respuesta:
{
  "type": "action_plan",
  "items": [
    {
      "step": 1,
      "status": "ok",
      "module": "inventario",
      "operation": "create",
      "message": ""
    }
  ]
}

Usuario: elimina producto
Respuesta:
{
  "type": "action_plan",
  "items": [
    {
      "step": 1,
      "status": "unsupported",
      "module": "inventario",
      "operation": "delete",
      "message": "La operación delete no está soportada para el módulo inventario."
    }
  ]
}

Usuario: elimina cliente
Respuesta:
{
  "type": "action_plan",
  "items": [
    {
      "step": 1,
      "status": "ok",
      "module": "cliente",
      "operation": "delete",
      "message": ""
    }
  ]
}

Usuario: lista compra y crea producto
Respuesta:
{
  "type": "action_plan",
  "items": [
    {
      "step": 1,
      "status": "ok",
      "module": "compra",
      "operation": "list",
      "message": ""
    },
    {
      "step": 2,
      "status": "ok",
      "module": "inventario",
      "operation": "create",
      "message": ""
    }
  ]
}
`.trim(),
  };
}

export function buildSingleActionPrompt(action: PlannedAction): ChatMessage {
  const moduleSchema = getModuleByName(action.module);
  const operationSchema = moduleSchema?.operations.find(
    item => item.operation === action.operation,
  );

  const fieldsText =
    operationSchema && operationSchema.bodyFields.length > 0
      ? operationSchema.bodyFields
          .map(field => `- ${field.name}: ${field.type}`)
          .join('\n')
      : 'Sin body. Usa {}.';

  return {
    role: 'system',
    content: `
Eres un generador de JSON para API Services.

Genera JSON para UNA SOLA acción.

Responde únicamente JSON válido.
No uses markdown.
No expliques nada.

Acción:
- step: ${action.step}
- module: ${action.module}
- operation: ${action.operation}

Datos reales de esta operación:
- method: ${operationSchema?.method}
- path: ${operationSchema?.path}
- requiere id: ${operationSchema?.requiresId ? 'sí' : 'no'}

Campos del body:
${fieldsText}

Reglas:
- Devuelve type "api_services".
- Devuelve exactamente una acción dentro de actions.
- Usa method y path reales de la operación.
- Si path tiene :id, reemplázalo por un id numérico inventado y pon params {"id": id}.
- Si hay bodyFields, inventa valores realistas para esos campos.
- Si no hay bodyFields, usa body {}.
- Para emails inventados usa @example.com.
- No uses valores como "string", "number", "test" o vacíos.
`.trim(),
  };
}