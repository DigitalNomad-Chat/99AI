export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCallRequest {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolCallResult {
  toolCallId: string;
  name: string;
  content: string;
  error?: string;
}

export interface IToolProvider {
  namespace: string;
  getTools(): Promise<ToolDefinition[]>;
  execute(request: ToolCallRequest): Promise<ToolCallResult>;
}
