export async function executeApiServices(json: any) {
  const sortedActions = [...json.actions].sort(
    (a, b) => a.step - b.step,
  );

  const results = [];

  for (const action of sortedActions) {
    const response = await executeAction(action);
    results.push(response);
  }

  return results;
}

async function executeAction(action: any) {
  const baseUrls: any = {
    clientes: 'http://localhost:5001',
    compras: 'http://localhost:5002',
    ventas: 'http://localhost:5003',
    inventario: 'http://localhost:5004',
  };

  const url = baseUrls[action.module] + action.path;

  const options: RequestInit = {
    method: action.method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (
    action.method !== 'GET' &&
    action.method !== 'DELETE'
  ) {
    options.body = JSON.stringify(action.body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} en ${action.module}`,
    );
  }

  return await response.json();
}

