import {API_MODULES} from './modules';

const moduleNames = API_MODULES.map(moduleSchema => moduleSchema.module);

const allOperationNames = Array.from(
  new Set(
    API_MODULES.flatMap(moduleSchema =>
      moduleSchema.operations.map(operation => operation.operation),
    ),
  ),
);

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
        actions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              step: {
                type: 'number',
              },
              module: {
                type: 'string',
                enum: moduleNames,
              },
              operation: {
                type: 'string',
                enum: allOperationNames,
              },
            },
            required: ['step', 'module', 'operation'],
          },
        },
      },
      required: ['type', 'actions'],
    },
  },
};

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