// core/src/expansions/base/ThreeOfAKindEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class ThreeOfAKindEffect implements ICardEffect {
  public readonly cardType = 'ThreeOfAKind';

  public async execute(context: IEffectContext): Promise<void> {
    const { state, actingPlayerId, input } = context;

    // Identify valid targets (players with cards)
    const availableTargets = state.activePlayers
      .filter(p => p.id !== actingPlayerId && p.hand.length > 0)
      .map(p => p.id);

    if (availableTargets.length === 0) return;

    // Prompt acting player to choose a target
    const targetPlayerId = await input.promptTargetSelection(actingPlayerId, availableTargets);
    const targetPlayer = state.players.find(p => p.id === targetPlayerId);
    const actingPlayer = state.players.find(p => p.id === actingPlayerId);

    if (!targetPlayer || !actingPlayer) return;

    // Prompt acting player to name a card type
    const possibleCardTypes = [
      'Defuse', 'Attack', 'Skip', 'Favor', 'Shuffle', 
      'See The Future', 'Nope', 'Tacocat', 'Cattermelon', 
      'Hairy Potato Cat', 'Overweight Bikini Cat', 'Rainbow-Ralphing Cat'
    ];
    
    const requestedCardType = await input.promptCardTypeSelection(actingPlayerId, possibleCardTypes);

    // Check if target has the requested card
    const targetCardIndex = targetPlayer.hand.findIndex(c => 
      c.type === requestedCardType || c.name === requestedCardType
    );

    if (targetCardIndex !== -1) {
      // If successful, move the card
      const stolenCard = targetPlayer.hand.splice(targetCardIndex, 1)[0];
      actingPlayer.hand.push(stolenCard);

      await input.notifyPlayer!(actingPlayerId, `You successfully stole a ${stolenCard.name} from ${targetPlayerId}!`, [stolenCard]);
      await input.notifyPlayer!(targetPlayerId, `${actingPlayerId} correctly guessed and stole your ${stolenCard.name}!`, [stolenCard]);
    } else {
      // Otherwise, nothing happens
      await input.notifyPlayer!(actingPlayerId, `${targetPlayerId} did not have a ${requestedCardType}.`);
      await input.notifyPlayer!(targetPlayerId, `${actingPlayerId} asked you for a ${requestedCardType}, but you didn't have it.`);
    }
  }
}