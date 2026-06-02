export type FieldType = 'string' | 'number' | 'date';

export type ApiField = {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
};

export type ApiOperationSchema = {
  operation: string;
  aliases: string[];
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  requiresId: boolean;
  bodyFields: ApiField[];
  description: string;
};

export type ApiModuleSchema = {
  module: string;
  aliases: string[];
  operations: ApiOperationSchema[];
};

export type ActionPlanItemStatus = 'ok' | 'unsupported';

export type ActionPlanItem = {
  step: number;
  status: ActionPlanItemStatus;
  action_key: string;
};

export type ActionPlan = {
  type: 'action_plan';
  items: ActionPlanItem[];
};

export type PlannedAction = {
  step: number;
  module: string;
  operation: string;
};