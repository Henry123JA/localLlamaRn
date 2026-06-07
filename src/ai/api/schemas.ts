import { getActionKeys} from './modules';
import type {PlannedAction} from './types';
import {getActionByKey} from './modules';
const actionKeys = getActionKeys();

export const plannerResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'action_plan',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['action_plan'],
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              step: {
                type: 'number',
              },
              status: {
                type: 'string',
                enum: ['ok', 'unsupported'],
              },
              action_key: {
                type: 'string',
                enum: [...actionKeys, 'unsupported'],
              },
            },
            required: ['step', 'status', 'action_key'],
          },
        },
      },
      required: ['type', 'items'],
    },
  },
};
/*
export function buildApiServiceResponseFormatForModule(moduleName: string) {
  const moduleSchema = API_MODULES.find(item => item.module === moduleName);

  const operationNames =
    moduleSchema?.operations.map(operation => operation.operation) ?? [];

  return {
    type: 'json_schema',
    json_schema: {
      name: 'api_services_single_action',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: {
            type: 'string',
            enum: ['api_services'],
          },
          actions: {
            type: 'array',
            minItems: 1,
            maxItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                step: {
                  type: 'number',
                },
                module: {
                  type: 'string',
                  enum: [moduleName],
                },
                operation: {
                  type: 'string',
                  enum: operationNames,
                },
                method: {
                  type: 'string',
                  enum: ['GET', 'POST', 'PUT', 'DELETE'],
                },
                path: {
                  type: 'string',
                },
                params: {
                  type: 'object',
                },
                body: {
                  type: 'object',
                },
              },
              required: [
                'step',
                'module',
                'operation',
                'method',
                'path',
                'params',
                'body',
              ],
            },
          },
        },
        required: ['type', 'actions'],
      },
    },
  };
}
  */



function fieldTypeToJsonSchemaType(type: string) {
  if (type === 'number') {
    return 'number';
  }

  return 'string';
}

export function buildApiServiceResponseFormatForAction(action: PlannedAction) {
  const actionData = getActionByKey(`${action.module}.${action.operation}`);

  if (!actionData) {
    throw new Error(`No existe la acción ${action.module}.${action.operation}`);
  }

  const {moduleSchema, operationSchema} = actionData;

  const bodyProperties: Record<string, any> = {};
  const bodyRequired: string[] = [];

  for (const field of operationSchema.bodyFields) {
    bodyProperties[field.name] = {
      type: fieldTypeToJsonSchemaType(field.type),
    };

    if (field.required) {
      bodyRequired.push(field.name);
    }
  }

  const paramsSchema = operationSchema.requiresId
    ? {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'number',
          },
        },
        required: ['id'],
      }
    : {
        type: 'object',
        additionalProperties: false,
        properties: {},
        required: [],
      };

  const bodySchema = {
    type: 'object',
    additionalProperties: false,
    properties: bodyProperties,
    required: bodyRequired,
  };

  return {
    type: 'json_schema',
    json_schema: {
      name: 'api_services_single_action',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: {
            type: 'string',
            enum: ['api_services'],
          },
          actions: {
            type: 'array',
            minItems: 1,
            maxItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                step: {
                  type: 'number',
                },
                module: {
                  type: 'string',
                  enum: [moduleSchema.module],
                },
                operation: {
                  type: 'string',
                  enum: [operationSchema.operation],
                },
                method: {
                  type: 'string',
                  enum: [operationSchema.method],
                },
                path: {
                  type: 'string',
                },
                params: paramsSchema,
                body: bodySchema,
              },
              required: [
                'step',
                'module',
                'operation',
                'method',
                'path',
                'params',
                'body',
              ],
            },
          },
        },
        required: ['type', 'actions'],
      },
    },
  };
}
////////////////////////// PARA PROBAR CON EL PLANNER
