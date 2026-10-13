// core/src/interfaces/IEffectContext.ts
import { GameState } from '../models/GameState';
import { Card } from '../models/Types';

// Abstraction for testability
export interface IRandomProvider {
  shuffle<T>(array: T[]): T[];
  getRandomInt(max: number): number;
}

// Decouples game logic from network/terminal
export interface IPlayerInput {
  promptTargetSelection(actingPlayerId: string, availableTargets: string[]): Promise<string>;
  promptCardSelection(actingPlayerId: string, hand: Card[]): Promise<string>;
  promptRearrangeCards(actingPlayerId: string, cards: string[]): Promise<string[]>; // For e.g Alter the future
  promptDeckInsertion(actingPlayerId: string, maxIndex: number): Promise<number>; // For e.g. placing back the defused kitten
  promptActionInterrupt(timeoutMs: number): Promise<boolean>; // For the 5-second Nope window
  notifyPlayer(actingPlayerId: string, message: string, cards?: any[]): Promise<void>; // Private message to a specific player
}

export interface IEffectContext {
  state: GameState;
  actingPlayerId: string;
  random: IRandomProvider;
  input: IPlayerInput;
}