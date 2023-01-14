export const actionRegex = (actionName: string, flags = '') =>
  new RegExp(`[^\\w^.]${actionName}\\(`, flags);

export const actionToReplace = (actionName: string) =>
  new RegExp(`([^\n]*${actionName}[^\n]*)`);
