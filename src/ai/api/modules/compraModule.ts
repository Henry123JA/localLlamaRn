import type {ApiModuleSchema} from '../types';

export const compraModule: ApiModuleSchema = {
  module: 'compra',
  aliases: ['compra', 'compras'],
  operations: [
    {
      operation: 'list',
      aliases: ['listar', 'lista', 'mostrar', 'muestra', 'ver'],
      method: 'GET',
      path: '/compra',
      requiresId: false,
      bodyFields: [],
      description: 'Listar compras',
    },
    {
      operation: 'create',
      aliases: ['crear', 'crea', 'comprar', 'compra', 'registrar compra'],
      method: 'POST',
      path: '/compra',
      requiresId: false,
      bodyFields: [
        {name: 'inventario_id', type: 'number', required: true},
        {name: 'cantidad', type: 'number', required: true},
        {name: 'costo_unitario', type: 'number', required: true},
      ],
      description: 'Crear compra',
    },
  ],
};