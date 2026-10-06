// core/src/expansions/base/AttackEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class AttackEffect implements ICardEffect {
  public readonly cardType = 'Attack';

  public async execute(context: IEffectContext): Promise<void> {
    const { state } = context;
    
    // The logic checks if the previous card was an Attack.
    const lastCardDiscarded = state.discardPile.length > 0 
      ? state.discardPile[state.discardPile.length - 1] 
      : null;

    const isChainedAttack = lastCardDiscarded?.type === 'Attack';
    
    if (isChainedAttack) {
      state.applyAttack(2);
    } else {
      // If not chained, the current player just passes their turns, 
      // and the next player gets exactly 2 turns.
      state.applyAttack(2); 
    }
  }
}