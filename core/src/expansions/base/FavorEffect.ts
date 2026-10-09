// core/src/expansions/base/FavorEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class FavorEffect implements ICardEffect {
  public readonly cardType = 'Favor';

  public async execute(context: IEffectContext): Promise<void> {
    const { state, actingPlayerId, input } = context;

    // Find targets who are not the acting player and have cards to give
    const availableTargets = state.activePlayers
      .filter(p => p.id !== actingPlayerId && p.hand.length > 0)
      .map(p => p.id);

    // If everyone else has 0 cards, the effect is not applied
    if (availableTargets.length === 0) {
      return; 
    }

    // Prompt the acting player to choose a target
    const targetPlayerId = await input.promptTargetSelection(
       actingPlayerId,
       availableTargets,
    )

    const targetPlayer = state.players.find(p => p.id === targetPlayerId);
    const actingPlayer = state.players.find(p => p.id === actingPlayerId);

    if (!targetPlayer || !actingPlayer) {
    	throw new Error('Invalid player selection');
	}

	// Prompt the target player to choose a card to give
	const cardToGive = await input.promptCardSelection(
		targetPlayerId,
		targetPlayer.hand,
	);

	// Remove the selected card from the target player's hand and add it to the acting player's hand
	const cardIndex = targetPlayer.hand.findIndex(card => card.id === cardToGive);
	if (cardIndex !== -1) {
		const card = targetPlayer.hand.splice(cardIndex, 1)[0];
		actingPlayer.hand.push(card);
		await input.notifyPlayer(
			actingPlayerId,
			`You received a card from ${targetPlayerId}.`,
			[card]
		);
		await input.notifyPlayer(
			targetPlayerId,
			`You gave a card to ${actingPlayerId}.`,
			[card]
		);
	}
  }
}