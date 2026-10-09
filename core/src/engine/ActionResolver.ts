// core/src/engine/ActionResolver.ts
import { ICardEffect } from '../expansions/ICardEffect';
import { IEffectContext } from '../interfaces/IEffectContext';

export class ActionResolver {
  private effects: Map<string, ICardEffect> = new Map();

  // egister new expansion cards dynamically
  public registerEffect(effect: ICardEffect): void {
    this.effects.set(effect.cardType, effect);
  }

  public async playCard(cardType: string, context: IEffectContext): Promise<void> {
    const effect = this.effects.get(cardType);
    
    if (!effect) {
      // Handles standard Cat cards that don't have individual play effects
      return;
    }

    const wasNoped = await context.input.promptActionInterrupt(5000);

    if (wasNoped) {
      // If the action was noped, we return without executing the effect
      return;
    }

    // If the action was not noped, we execute the effect
    await effect.execute(context);
  }
}