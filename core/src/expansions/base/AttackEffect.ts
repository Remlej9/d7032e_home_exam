// core/src/expansions/base/AttackEffect.ts
import { ICardEffect } from '../ICardEffect';
import { IEffectContext } from '../../interfaces/IEffectContext';

export class AttackEffect implements ICardEffect {
  public readonly cardType = 'Attack';

  public async execute(context: IEffectContext): Promise<void> {
    context.state.applyAttack(2);
  }
}