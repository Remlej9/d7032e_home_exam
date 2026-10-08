// core/src/expansions/base/ShuffleEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class ShuffleEffect implements ICardEffect {
  public readonly cardType = 'Shuffle';

  public async execute(context: IEffectContext): Promise<void> {
    context.state.shuffleDrawPile(context.random);
  }
}