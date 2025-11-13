export type GraphPayload = {
  allActions: Array<{ name: string; nested?: boolean }>;
  fromComponents: Record<string, string[]>;
  fromEffects: Record<string, { input: string[]; output: string[] }>;
  fromReducers: Record<string, string[]>;
  loadedActions?: Array<{ name: string; payloadActions: string[] }>;
};
