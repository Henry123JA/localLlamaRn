import type {ApiModuleSchema} from '../types';

export const inventarioModule: ApiModuleSchema = {
  module: 'inventario',
  aliases: ['inventario', 'producto', 'productos', 'stock'],
  operations: [
    {
      operation: 'list',
      aliases: ['listar', 'lista', 'mostrar', 'muestra', 'ver'],
      method: 'GET',
      path: '/inventario',
      requiresId: false,
      bodyFields: [],
      description: 'Listar inventario',
    },
    {
      operation: 'create',
      aliases: ['crear', 'crea', 'registrar', 'registra', 'agregar', 'agrega'],
      method: 'POST',
      path: '/inventario',
      requiresId: false,
      bodyFields: [
        {name: 'nombre', type: 'string', required: true},
        {name: 'descripcion', type: 'string', required: true},
        {name: 'precio_venta', type: 'number', required: true},
        {name: 'cantidad', type: 'number', required: true},
      ],
      description: 'Crear item de inventario',
    },
    {
      operation: 'adjust_stock',
      aliases: [
        'ajustar',
        'ajusta',
        'ajustar stock',
        'aumentar',
        'aumenta',
        'disminuir',
        'disminuye',
        'reducir',
        'reduce',
      ],
      method: 'PUT',
      path: '/inventario/:id',
      requiresId: true,
      bodyFields: [
        {name: 'cambio', type: 'number', required: true},
      ],
      description: 'Ajustar stock de un item de inventario',
    },
  ],
};