type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ActionConfig {
  baseUrl: string;
  method: HttpMethod;
  path: string;
  fields: string[];
}

type ValidActions = Record<
  string,
  Record<string, ActionConfig>
>;

const ERP_BASE_URL =
  'https://hammerhead-app-6wwxx.ondigitalocean.app';

export const validActions: ValidActions = {
  inventario: {
    listar: {
      baseUrl: ERP_BASE_URL,
      method: 'GET',
      path: '/erp/inventario/',
      fields: [],
    },

    crear: {
      baseUrl: ERP_BASE_URL,
      method: 'POST',
      path: '/erp/inventario/',
      fields: [
        'nombre',
        'descripcion',
        'precio_venta',
        'cantidad',
      ],
    },

    ajustar_stock: {
      baseUrl: ERP_BASE_URL,
      method: 'PUT',
      path: '/erp/inventario/:id',
      fields: ['cambio'],
    },
  },

  clientes: {
    listar: {
      baseUrl: ERP_BASE_URL,
      method: 'GET',
      path: '/erp/clientes',
      fields: [],
    },

    crear: {
      baseUrl: ERP_BASE_URL,
      method: 'POST',
      path: '/erp/clientes',
      fields: ['nombre', 'apellido', 'email'],
    },

    editar: {
      baseUrl: ERP_BASE_URL,
      method: 'PUT',
      path: '/erp/clientes/:id',
      fields: ['nombre', 'apellido', 'email'],
    },

    eliminar: {
      baseUrl: ERP_BASE_URL,
      method: 'DELETE',
      path: '/erp/clientes/:id',
      fields: [],
    },
  },

  compras: {
    listar: {
      baseUrl: ERP_BASE_URL,
      method: 'GET',
      path: '/erp/compras',
      fields: [],
    },

    crear: {
      baseUrl: ERP_BASE_URL,
      method: 'POST',
      path: '/erp/compras',
      fields: [
        'inventario_id',
        'cantidad',
        'costo_unitario',
      ],
    },
  },

  ventas: {
    listar: {
      baseUrl: ERP_BASE_URL,
      method: 'GET',
      path: '/erp/ventas',
      fields: [],
    },

    crear: {
      baseUrl: ERP_BASE_URL,
      method: 'POST',
      path: '/erp/ventas',
      fields: [
        'inventario_id',
        'cliente_id',
        'cantidad',
      ],
    },
  },
};

/**
 * Elimina bloques Markdown y extrae el objeto JSON
 * producido por el modelo.
 */
export function cleanAndParseJson(text: string): unknown {
  let cleaned = String(text)
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(
      'No se encontró un objeto JSON en la respuesta del modelo',
    );
  }

  cleaned = cleaned.substring(
    firstBrace,
    lastBrace + 1,
  );

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      'El modelo no devolvió un JSON correctamente formado',
    );
  }
}

function isObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Validación mínima:
 * solamente confirma que el resultado sea un objeto.
 */
export function validateApiServicesJson(
  json: unknown,
): Record<string, unknown> {
  if (!isObject(json)) {
    throw new Error(
      'La respuesta de la IA debe ser un objeto JSON',
    );
  }

  return json;
}