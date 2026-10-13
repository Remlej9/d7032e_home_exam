// core/src/engine/ActionResolver.ts
import { ICardEffect } from '../expansions/ICardEffect';
import { IEffectContext } from '../interfaces/IEffectContext';

export class ActionResolver {
  private effects: Map<string, ICardEffect> = new Map();

  public registerEffect(effect: ICardEffect): void {
    this.effects.set(effect.cardType, effect);
  }

  // Gather info before Nope window
  public async prepareCard(cardType: string, context: IEffectContext): Promise<any> {
    const effect = this.effects.get(cardType);
    if (effect && effect.prepare) {
      return await effect.prepare(context);
    }
    return undefined;
  }

  // Apply the effect after Nope window
  public async executeCard(cardType: string, context: IEffectContext, payload: any): Promise<void> {
    const effect = this.effects.get(cardType);
    if (effect) {
      await effect.execute(context, payload);
    }
  }
}