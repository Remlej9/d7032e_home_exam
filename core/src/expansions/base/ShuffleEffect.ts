// core/src/expansions/base/ShuffleEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class ShuffleEffect implements ICardEffect {
  public readonly cardType = 'Shuffle';

  public async execute(context: IEffectContext): Promise<void> {
    const { state, random } = context;
    
    console.log("Top card (before):", state.drawPile.slice(-1));
    state.drawPile = random.shuffle(state.drawPile);
    console.log("Top card (after): ", state.drawPile.slice(-1));
  }
}