import { uniq } from 'lodash';

import { EffectsStructure, InputOutputMap } from './models';

export function chainActionsByInput(
  fromEffects: EffectsStructure,
  action: string,
): InputOutputMap[] {
  try {
    return Object.values(fromEffects).reduce(
      (result: InputOutputMap[], v: InputOutputMap) => {
        if (v.input.includes(action)) {
          const chainedPerEffect = v.output.flatMap(obj =>
            chainActionsByInput(fromEffects, obj),
          );
          return uniq([...result, v, ...chainedPerEffect]);
        }

        return result;
      },
      [],
    );
  } catch {
    return [];
  }
}

export function chainActionsByOutput(
  fromEffects: EffectsStructure,
  action: string,
): InputOutputMap[] {
  try {
    return Object.values(fromEffects).reduce(
      (result: InputOutputMap[], v: InputOutputMap) => {
        if (v.output.includes(action)) {
          const chainedPerEffect = v.input.flatMap(obj =>
            chainActionsByOutput(fromEffects, obj),
          );
          return uniq([...result, v, ...chainedPerEffect]);
        }

        return result;
      },
      [],
    );
  } catch {
    return [];
  }
}
