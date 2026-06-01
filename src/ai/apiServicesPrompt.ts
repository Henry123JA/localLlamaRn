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
No generes body, method ni path.

Formato:
{
  "type": "action_plan",
  "actions": [
    {
      "step": 1,
      "module": "cliente",
      "operation": "create"
    }
  ]
}

Módulos y operaciones disponibles:
${buildModulesDescriptionForPrompt()}

Reglas:
- Si el usuario pide una acción, devuelve una acción.
- Si el usuario pide varias acciones, devuelve varias acciones.
- Cada acción debe tener step empezando desde 1.
- Respeta el orden pedido por el usuario.
- Usa solo módulos y operaciones disponibles.
- Si no entiendes ninguna acción válida, devuelve actions vacío.
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