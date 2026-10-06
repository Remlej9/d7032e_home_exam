// core/src/models/GameState.ts
import { Card, Player } from './Types';

export class GameState {
  public players: Player[] = [];
  public drawPile: Card[] = [];
  public discardPile: Card[] = [];
  
  public currentPlayerIndex: number = 0;
  
  // Tracks how many turns the current player must take (starts at 1, increases with Attack cards)
  public turnsRemaining: number = 1; 
  
  // A stack to track active cards during the 5-second Nope window
  public actionStack: Card[] = []; 

  constructor(players: Player[]) {
    this.players = players;
  }

  public get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex];
  }

  public get activePlayers(): Player[] {
    return this.players.filter(p => !p.hasExploded);
  }

  public get isGameOver(): boolean {
    // The game ends when all but one player has exploded
    return this.activePlayers.length <= 1;
  }
  
  public moveNextTurn(): void {
    if (this.turnsRemaining > 1) {
      this.turnsRemaining--;
      return;
    }
    
    this.turnsRemaining = 1;
    this.cycleToNextActivePlayer();
  }

  public applyAttack(additionalTurns: number): void {
    // Next player takes remaining turns plus 2
    this.turnsRemaining = this.turnsRemaining + additionalTurns;
    this.cycleToNextActivePlayer();
  }

  private cycleToNextActivePlayer(): void {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    } while (this.players[this.currentPlayerIndex].hasExploded && !this.isGameOver);
  }
}