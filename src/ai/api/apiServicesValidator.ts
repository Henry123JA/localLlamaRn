const validActions: any = {
  ventas: {
    listar: { method: 'GET', path: '/venta', fields: [] },
    crear: { method: 'POST', path: '/venta', fields: ['inventario_id', 'cliente_id', 'cantidad'] },
  },
  compras: {
    listar: { method: 'GET', path: '/compra', fields: [] },
    crear: { method: 'POST', path: '/compra', fields: ['inventario_id', 'cantidad', 'costo_unitario'] },
  },
  clientes: {
    listar: { method: 'GET', path: '/cliente', fields: [] },
    crear: { method: 'POST', path: '/cliente', fields: ['nombre', 'apellido', 'email'] },
    editar: { method: 'PUT', path: '/cliente/:id', fields: ['nombre', 'apellido', 'email'] },
    eliminar: { method: 'DELETE', path: '/cliente/:id', fields: [] },
  },
  inventario: {
    listar: { method: 'GET', path: '/inventario', fields: [] },
    crear: { method: 'POST', path: '/inventario', fields: ['nombre', 'descripcion', 'precio_venta', 'cantidad'] },
    ajustar_stock: { method: 'PUT', path: '/inventario/:id', fields: ['cambio'] },
  },
};

export function cleanAndParseJson(text: string) {
  let cleaned = String(text).trim();

  cleaned = cleaned
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No se encontró JSON válido en la respuesta del modelo');
  }

  cleaned = cleaned.substring(firstBrace, lastBrace + 1);

  return JSON.parse(cleaned);
}

export function validateApiServicesJson(json: any) {
  if (json?.type !== 'api_services') {
    throw new Error('Respuesta inválida: type debe ser api_services');
  }

  if (!Array.isArray(json.actions)) {
    throw new Error('Respuesta inválida: actions debe ser array');
  }

  for (const action of json.actions) {
    const moduleData = validActions[action.module];

    if (!moduleData) {
      throw new Error(`Módulo inválido: ${action.module}`);
    }

    const operationData = moduleData[action.operation];

    if (!operationData) {
      throw new Error(`Operación inválida: ${action.module}.${action.operation}`);
    }

    if (action.method !== operationData.method) {
      throw new Error(`Método inválido en ${action.module}.${action.operation}`);
    }

    if (operationData.path.includes(':id')) {
      if (!action.params?.id) {
        throw new Error(`Falta params.id en ${action.module}.${action.operation}`);
      }

      const expectedPath = operationData.path.replace(':id', String(action.params.id));

      if (action.path !== expectedPath) {
        throw new Error(`Path inválido. Esperado: ${expectedPath}`);
      }
    } else {
      if (action.path !== operationData.path) {
        throw new Error(`Path inválido. Esperado: ${operationData.path}`);
      }
    }

    const body = action.body ?? {};

    for (const key of Object.keys(body)) {
      if (!operationData.fields.includes(key)) {
        throw new Error(`Campo no permitido: ${key}`);
      }
    }
  }

  return json;
}