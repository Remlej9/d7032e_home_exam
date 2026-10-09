// core/src/expansions/base/SeeTheFutureEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class SeeTheFutureEffect implements ICardEffect {
  public readonly cardType = 'SeeTheFuture';

  public async execute(context: IEffectContext): Promise<void> {
    const topCards = context.state.peekTopCards(3)

    await context.input.notifyPlayer(
    	context.actingPlayerId,
    	'You see the future!',
    	topCards
    );
  }
}