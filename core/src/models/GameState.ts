// core/src/models/GameState.ts
import { Card, Player } from './Types';

export class GameState {
  public players: Player[] = [];
  public drawPile: Card[] = [];
  public discardPile: Card[] = [];
  
  public currentPlayerIndex: number = 0;
  
  // Tracks how many turns the current player must take (starts at 1, increases with Attack cards)
  public turnsRemaining: number = 1; 

  // Track if the current player is under attack
  public isUnderAttack: boolean = false;
  
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
    this.isUnderAttack = false;
    this.cycleToNextActivePlayer();
  }

  public applyAttack(addedTurns: number): void {
    if (this.isUnderAttack) {
      // If under attack, add to remaining turns
      this.turnsRemaining += addedTurns;
    } else {
      // Overwrite the 1 standard turn with exactly 2 turns
      this.turnsRemaining = addedTurns;
      this.isUnderAttack = true;
    }
    
    // Pass the attack to the next player
    this.cycleToNextActivePlayer();
  }

  private cycleToNextActivePlayer(): void {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    } while (this.players[this.currentPlayerIndex].hasExploded && !this.isGameOver);
  }
}