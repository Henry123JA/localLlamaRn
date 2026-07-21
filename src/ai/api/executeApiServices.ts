import { validActions } from './apiServicesValidator';

type JsonObject = Record<string, unknown>;



function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function executeApiServices(
  generatedJson: JsonObject,
) {
  if (!Array.isArray(generatedJson.actions)) {
    throw new Error('El JSON no contiene un arreglo actions');
  }

  const results = [];

  for (let index = 0; index < generatedJson.actions.length; index++) {
    const action = generatedJson.actions[index];

    if (!isObject(action)) {
      throw new Error(`La acción ${index + 1} no es válida`);
    }

    const { module, operation } = action;

    if (
      typeof module !== 'string' ||
      typeof operation !== 'string'
    ) {
      throw new Error(
        `La acción ${index + 1} no tiene módulo u operación`,
      );
    }

    const data = isObject(action.data)
      ? action.data
      : {};

    const moduleConfig = validActions[module];

    if (!moduleConfig) {
      throw new Error(`Módulo desconocido: ${module}`);
    }

    const operationConfig = moduleConfig[operation];

    if (!operationConfig) {
      throw new Error(
        `Operación desconocida: ${module}.${operation}`,
      );
    }

    let path = operationConfig.path;
    const body: JsonObject = { ...data };

    // Reemplaza parámetros de la URL como :id.
    const pathParameters =
      path.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];

    for (const parameter of pathParameters) {
      const field = parameter.substring(1);
      const value = data[field];

      if (value === undefined || value === null) {
        throw new Error(
          `Falta ${field} en ${module}.${operation}`,
        );
      }

      path = path.replace(
        parameter,
        encodeURIComponent(String(value)),
      );

      // El id va en la URL, no en el body.
      delete body[field];
    }

    const url = `${operationConfig.baseUrl}${path}`;

    const hasBody =
      operationConfig.method !== 'GET' &&
      operationConfig.method !== 'DELETE';

    console.log(
      `EJECUTANDO ${index + 1}:`,
      operationConfig.method,
      url,
      hasBody ? body : '',
    );

    const response = await fetch(url, {
      method: operationConfig.method,
      headers: {
        Accept: 'application/json',
        ...(hasBody
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      ...(hasBody
        ? { body: JSON.stringify(body) }
        : {}),
    });

    const responseText = await response.text();

    let responseData: unknown;

    try {
      responseData = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      throw new Error(
        `${module}.${operation} falló (${response.status}): ${
          typeof responseData === 'string'
            ? responseData
            : JSON.stringify(responseData)
        }`,
      );
    }

    results.push({
      step: index + 1,
      module,
      operation,
      method: operationConfig.method,
      url,
      status: response.status,
      response: responseData,
    });
  }

  return results;
}