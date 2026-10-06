// core/src/expansions/ICardEffect.ts
import { IEffectContext } from '../interfaces/IEffectContext';

export interface ICardEffect {
  // Identifies which card type this effect belongs to
  readonly cardType: string;
  
  // Execute the logic
  execute(context: IEffectContext): Promise<void>;
}