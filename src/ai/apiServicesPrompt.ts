export function buildDirectGeneratorPrompt(): string {
  return `
Convierte la orden del usuario en acciones para un ERP.

Responde únicamente con este objeto JSON:
{"actions":[{"module":"","operation":"","data":{}}],"message":""}

OPERACIONES DISPONIBLES:

inventario.listar()

inventario.crear(
  nombre:string,
  descripcion:string,
  precio_venta:number>=0,
  cantidad:integer>0
)

inventario.ajustar_stock(
  id:integer>=1,
  cambio:integer!=0
)

clientes.listar()

clientes.crear(
  nombre:string,
  apellido:string,
  email:string
)

clientes.editar(
  id:integer>=1,
  nombre:string,
  apellido:string,
  email:string
)

clientes.eliminar(
  id:integer>=1
)

compras.listar()

compras.crear(
  inventario_id:integer>0,
  cantidad:integer>0,
  costo_unitario:number>=0
)

ventas.listar()

ventas.crear(
  inventario_id:integer>0,
  cliente_id:integer>0,
  cantidad:integer>0
)

REGLAS:
- Genera una acción por cada solicitud.
- Conserva el orden indicado por el usuario.
- Usa solamente los módulos, operaciones y campos disponibles.
- Coloca todos los valores dentro de data.
- integer significa número entero sin comillas.
- number significa número sin comillas.
- string significa texto entre comillas.
- Conserva exactamente los valores indicados por el usuario.
- Si faltan datos inventalos, pero que sean coherentes con la solicitud.
- No agregues editar o eliminar a módulos que no lo permitan.
- Una compra o venta ya modifica el stock; no agregues ajustar_stock.
- Si falta información necesaria, explica el problema en message.
- Si ninguna acción es válida, devuelve actions vacío.
- Si todas las acciones son válidas, message debe ser "".
`;
}