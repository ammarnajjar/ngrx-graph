export interface InputOutputMap {
  input: string[];
  output: string[];
}

export interface EffectsStructure {
  [k: string]: InputOutputMap;
}
export interface ActionsMap {
  [k: string]: string[];
}

export interface TypedAction {
  name: string;
  nested: boolean;
}

export interface LoadedAction {
  name: string;
  payloadActions: string[];
}
