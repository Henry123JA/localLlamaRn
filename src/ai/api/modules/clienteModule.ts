import type {ApiModuleSchema} from '../types';

export const clienteModule: ApiModuleSchema = {
  module: 'cliente',
  aliases: ['cliente', 'clientes'],
  operations: [
    {
      operation: 'list',
      aliases: ['listar', 'lista', 'mostrar', 'muestra', 'ver'],
      method: 'GET',
      path: '/cliente',
      requiresId: false,
      bodyFields: [],
      description: 'Listar clientes',
    },
    {
      operation: 'create',
      aliases: ['crear', 'crea', 'registrar', 'registra', 'agregar', 'agrega'],
      method: 'POST',
      path: '/cliente',
      requiresId: false,
      bodyFields: [
        {name: 'nombre', type: 'string', required: true},
        {name: 'apellido', type: 'string', required: true},
        {
          name: 'email',
          type: 'string',
          required: true,
          description: 'Si es inventado, debe terminar en @example.com',
        },
      ],
      description: 'Crear cliente',
    },
    {
      operation: 'update',
      aliases: ['editar', 'edita', 'actualizar', 'actualiza', 'modificar'],
      method: 'PUT',
      path: '/cliente/:id',
      requiresId: true,
      bodyFields: [
        {name: 'nombre', type: 'string', required: true},
        {name: 'apellido', type: 'string', required: true},
        {
          name: 'email',
          type: 'string',
          required: true,
          description: 'Si es inventado, debe terminar en @example.com',
        },
      ],
      description: 'Editar cliente',
    },
    {
      operation: 'delete',
      aliases: ['eliminar', 'elimina', 'borrar', 'borra','quita', 'quitar'],
      method: 'DELETE',
      path: '/cliente/:id',
      requiresId: true,
      bodyFields: [],
      description: 'Eliminar cliente',
    },
  ],
};