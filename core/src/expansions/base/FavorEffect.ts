// core/src/expansions/base/FavorEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

interface IFavorPayload {
  targetPlayerId: string;
}

export class FavorEffect implements ICardEffect<IFavorPayload> {
  public readonly cardType = 'Favor';

  // Pre-Nope pick target etc.
  public async prepare(context: IEffectContext): Promise<IFavorPayload | null> {
    const { state, actingPlayerId, input } = context;

    const availableTargets = state.activePlayers
      .filter(p => p.id !== actingPlayerId && p.hand.length > 0)
      .map(p => p.id);

    if (availableTargets.length === 0) {
      return null; 
    }

    // Prompt acting player
    const targetPlayerId = await input.promptTargetSelection(actingPlayerId, availableTargets);

    // Notify the target immediately
    await input.broadcastMessage(`${actingPlayerId} played Favor targeting ${targetPlayerId}!`);

    return { targetPlayerId };
  }

  // Execute the effect after the Nope window
  public async execute(context: IEffectContext, payload?: IFavorPayload): Promise<void> {
    if (!payload) return; 

    const { state, actingPlayerId, input } = context;
    const { targetPlayerId } = payload;
    
    const targetPlayer = state.players.find(p => p.id === targetPlayerId);
    const actingPlayer = state.players.find(p => p.id === actingPlayerId);

    if (!targetPlayer || !actingPlayer) throw new Error('Invalid player selection');

    // Prompt target for the card they wish to give
    const cardToGive = await input.promptCardSelection(targetPlayerId, targetPlayer.hand);

    const cardIndex = targetPlayer.hand.findIndex(card => card.id === cardToGive);
    if (cardIndex !== -1) {
        const card = targetPlayer.hand.splice(cardIndex, 1)[0];
        actingPlayer.hand.push(card);
        
        await input.notifyPlayer(actingPlayerId, `You received a card from ${targetPlayerId}.`, [card]);
        await input.notifyPlayer(targetPlayerId, `You gave a card to ${actingPlayerId}.`, [card]);
    }
  }
}