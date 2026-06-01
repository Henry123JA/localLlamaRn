import type {ApiModuleSchema} from '../types';

export const ventaModule: ApiModuleSchema = {
  module: 'venta',
  aliases: ['venta', 'ventas'],
  operations: [
    {
      operation: 'list',
      aliases: ['listar', 'lista', 'mostrar', 'muestra', 'ver'],
      method: 'GET',
      path: '/venta',
      requiresId: false,
      bodyFields: [],
      description: 'Listar ventas',
    },
    {
      operation: 'create',
      aliases: ['crear', 'crea', 'vender', 'vende', 'registrar venta'],
      method: 'POST',
      path: '/venta',
      requiresId: false,
      bodyFields: [
        {name: 'inventario_id', type: 'number', required: true},
        {name: 'cliente_id', type: 'number', required: true},
        {name: 'cantidad', type: 'number', required: true},
      ],
      description: 'Crear venta',
    },
  ],
};