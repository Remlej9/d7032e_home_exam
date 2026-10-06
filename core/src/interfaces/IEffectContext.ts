// core/src/interfaces/IEffectContext.ts
import { GameState } from '../models/GameState';

// Abstraction for testability
export interface IRandomProvider {
  shuffle<T>(array: T[]): T[];
  getRandomInt(max: number): number;
}

// Decouples game logic from network/terminal
export interface IPlayerInput {
  promptTargetSelection(actingPlayerId: string, availableTargets: string[]): Promise<string>;
  promptCardSelection(actingPlayerId: string, hand: string[]): Promise<string>;
  promptActionInterrupt(timeoutMs: number): Promise<boolean>; // For the 5-second Nope window
}

export interface IEffectContext {
  state: GameState;
  actingPlayerId: string;
  random: IRandomProvider;
  input: IPlayerInput;
}