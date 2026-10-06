// core/src/expansions/base/SkipEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class SkipEffect implements ICardEffect {
  public readonly cardType = 'Skip';

  public async execute(context: IEffectContext): Promise<void> {
    const { state } = context;
    
    state.moveNextTurn();
  }
}