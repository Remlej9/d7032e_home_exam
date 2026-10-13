// core/src/expansions/base/TwoOfAKindEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

interface ITwoOfAKindPayload {
  targetPlayerId: string;
}

export class TwoOfAKindEffect implements ICardEffect {
  public readonly cardType = 'TwoOfAKind';

  public async prepare(context: IEffectContext): Promise<ITwoOfAKindPayload | null> {
    const { state, actingPlayerId, input } = context;

    const availableTargets = state.activePlayers
      .filter(p => p.id !== actingPlayerId && p.hand.length > 0)
      .map(p => p.id);

    if (availableTargets.length === 0) return null;

    const targetPlayerId = await input.promptTargetSelection(actingPlayerId, availableTargets);
    
    // Announce the target before the Nope window
    await input.broadcastMessage(`${actingPlayerId} played Two of a Kind targeting ${targetPlayerId}!`);

    return { targetPlayerId };
  }

  public async execute(context: IEffectContext, payload?: ITwoOfAKindPayload): Promise<void> {
    if (!payload) return;
    const { state, actingPlayerId, input, random } = context;
    
    const targetPlayer = state.players.find(p => p.id === payload.targetPlayerId);
    const actingPlayer = state.players.find(p => p.id === actingPlayerId);

    if (!targetPlayer || !actingPlayer) return;

    const randomCardIndex = random.getRandomInt(targetPlayer.hand.length);
    const stolenCard = targetPlayer.hand.splice(randomCardIndex, 1)[0];
    actingPlayer.hand.push(stolenCard);

    await input.notifyPlayer!(actingPlayerId, `You stole a ${stolenCard.name} from ${payload.targetPlayerId}`, [stolenCard]);
    await input.notifyPlayer!(payload.targetPlayerId, `${actingPlayerId} stole a ${stolenCard.name} from you!`, [stolenCard]);
  }
}