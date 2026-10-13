// core/src/expansions/base/ThreeOfAKindEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

interface IThreeOfAKindPayload {
  targetPlayerId: string;
  requestedCardType: string;
}

export class ThreeOfAKindEffect implements ICardEffect<IThreeOfAKindPayload> {
  public readonly cardType = 'ThreeOfAKind';

  public async prepare(context: IEffectContext): Promise<IThreeOfAKindPayload | null> {
    const { state, actingPlayerId, input } = context;

    const availableTargets = state.activePlayers
      .filter(p => p.id !== actingPlayerId && p.hand.length > 0)
      .map(p => p.id);

    if (availableTargets.length === 0) return null;

    const targetPlayerId = await input.promptTargetSelection(actingPlayerId, availableTargets);
    
    const possibleCardTypes = [
      'Defuse', 'Attack', 'Skip', 'Favor', 'Shuffle', 
      'See The Future', 'Nope', 'Tacocat', 'Cattermelon', 
      'Hairy Potato Cat', 'Overweight Bikini Cat', 'Rainbow-Ralphing Cat'
    ];
    
    const requestedCardType = await input.promptCardTypeSelection(actingPlayerId, possibleCardTypes);

    // Announce the target and request before the Nope window
    await input.broadcastMessage(`${actingPlayerId} played Three of a Kind targeting ${targetPlayerId}, asking for a ${requestedCardType}!`);

    return { targetPlayerId, requestedCardType };
  }

  public async execute(context: IEffectContext, payload?: IThreeOfAKindPayload): Promise<void> {
    if (!payload) return;
    const { state, actingPlayerId, input } = context;

    const targetPlayer = state.players.find(p => p.id === payload.targetPlayerId);
    const actingPlayer = state.players.find(p => p.id === actingPlayerId);

    if (!targetPlayer || !actingPlayer) return;

    const targetCardIndex = targetPlayer.hand.findIndex(c => 
      c.type === payload.requestedCardType || c.name === payload.requestedCardType
    );

    if (targetCardIndex !== -1) {
      const stolenCard = targetPlayer.hand.splice(targetCardIndex, 1)[0];
      actingPlayer.hand.push(stolenCard);

      await input.notifyPlayer!(actingPlayerId, `Success! You stole a ${stolenCard.name} from ${payload.targetPlayerId}!`, [stolenCard]);
      await input.notifyPlayer!(payload.targetPlayerId, `${actingPlayerId} correctly guessed and stole your ${stolenCard.name}!`, [stolenCard]);
    } else {
      await input.broadcastMessage(`${payload.targetPlayerId} did not have a ${payload.requestedCardType}.`);
    }
  }
}