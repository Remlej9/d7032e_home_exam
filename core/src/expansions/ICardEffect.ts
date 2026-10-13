// core/src/expansions/ICardEffect.ts
import { IEffectContext } from '../interfaces/IEffectContext';

export interface ICardEffect<TPayload = any> {
  // Identifies which card type this effect belongs to
  readonly cardType: string;

  // Optional preparation phase to gather targets before the nope window
  prepare?(context: IEffectContext): Promise<TPayload | null>;
  
  // Execute the logic
  execute(context: IEffectContext, payload?: any): Promise<void>;
}