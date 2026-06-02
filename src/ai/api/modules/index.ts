import type {ApiModuleSchema} from '../types';
import {clienteModule} from './clienteModule';
import {inventarioModule} from './inventarioModule';
import {compraModule} from './compraModule';
import {ventaModule} from './ventaModule';

export const API_MODULES: ApiModuleSchema[] = [
  clienteModule,
  inventarioModule,
  compraModule,
  ventaModule,
];

export function getModuleNames() {
  return API_MODULES.map(item => item.module);
}

export function getModuleByName(moduleName: string) {
  return API_MODULES.find(item => item.module === moduleName) ?? null;
}

export function getOperationNamesForModule(moduleName: string) {
  const moduleSchema = getModuleByName(moduleName);

  if (!moduleSchema) {
    return [];
  }

  return moduleSchema.operations.map(item => item.operation);
}

export function buildModulesDescriptionForPrompt() {
  return API_MODULES.map(moduleSchema => {
    const moduleAliases = moduleSchema.aliases.join(', ');

    const operations = moduleSchema.operations
      .map(operation => {
        const operationAliases = operation.aliases.join(', ');

        const fields =
          operation.bodyFields.length === 0
            ? '{}'
            : operation.bodyFields
                .map(field => `${field.name}: ${field.type}`)
                .join(', ');

        return `  - ${operation.operation}: ${operation.method} ${operation.path}
    descripción: ${operation.description}
    alias de operación: ${operationAliases}
    body: ${fields}`;
      })
      .join('\n');

    return `Módulo ${moduleSchema.module}
Alias del módulo: ${moduleAliases}
Operaciones:
${operations}`;
  }).join('\n\n');
}

export function buildPlannerModulesDescriptionForPrompt() {
  return API_MODULES.map(moduleSchema => {
    const moduleAliases = moduleSchema.aliases.join(', ');

    const operations = moduleSchema.operations
      .map(operation => {
        const operationAliases = operation.aliases.join(', ');

        return `- ${operation.operation}: ${operation.description}. Alias: ${operationAliases}`;
      })
      .join('\n');

    return `Módulo: ${moduleSchema.module}
Alias: ${moduleAliases}
Operaciones:
${operations}`;
  }).join('\n\n');
}
export function getActionKeys() {
  return API_MODULES.flatMap(moduleSchema =>
    moduleSchema.operations.map(operation => {
      return `${moduleSchema.module}.${operation.operation}`;
    }),
  );
}

export function getActionByKey(actionKey: string) {
  const [moduleName, operationName] = actionKey.split('.');

  if (!moduleName || !operationName) {
    return null;
  }

  const moduleSchema = getModuleByName(moduleName);

  if (!moduleSchema) {
    return null;
  }

  const operationSchema =
    moduleSchema.operations.find(item => item.operation === operationName) ??
    null;

  if (!operationSchema) {
    return null;
  }

  return {
    moduleSchema,
    operationSchema,
  };
}
export function buildPlannerActionsDescriptionForPrompt() {
  return API_MODULES.map(moduleSchema => {
    const moduleAliases = moduleSchema.aliases.join(', ');

    const actions = moduleSchema.operations
      .map(operation => {
        return `${moduleSchema.module}.${operation.operation} (${operation.aliases.join(', ')})`;
      })
      .join('; ');

    return `- ${moduleSchema.module} [alias: ${moduleAliases}] => ${actions}`;
  }).join('\n');
}