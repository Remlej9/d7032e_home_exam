// core/src/expansions/base/TwoOfAKindEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class TwoOfAKindEffect implements ICardEffect {
  public readonly cardType = 'TwoOfAKind';

  public async execute(context: IEffectContext): Promise<void> {
    const { state, actingPlayerId, input, random } = context;

    const availableTargets = state.activePlayers
      .filter(p => p.id !== actingPlayerId && p.hand.length > 0)
      .map(p => p.id);

    if (availableTargets.length === 0) return;

    const targetPlayerId = await input.promptTargetSelection(actingPlayerId, availableTargets);
    const targetPlayer = state.players.find(p => p.id === targetPlayerId);
    const actingPlayer = state.players.find(p => p.id === actingPlayerId);

    if (!targetPlayer || !actingPlayer) return;

    // Pick a random card from the target's hand
    const randomCardIndex = random.getRandomInt(targetPlayer.hand.length);
    const stolenCard = targetPlayer.hand.splice(randomCardIndex, 1)[0];
    
    actingPlayer.hand.push(stolenCard);

    await input.notifyPlayer!(actingPlayerId, `You stole a random card from ${targetPlayerId}`, [stolenCard]);
    await input.notifyPlayer!(targetPlayerId, `${actingPlayerId} stole a random card from you!`, [stolenCard]);
  }
}