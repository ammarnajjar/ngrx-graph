import { generateDotForAction as _genAction } from './dot/generator';
import { generateDotFilesFromJson as _gen } from './dot/main';

export const generateDotFilesFromJson = _gen;
export const generateDotForAction = _genAction;

export default { generateDotFilesFromJson, generateDotForAction };
