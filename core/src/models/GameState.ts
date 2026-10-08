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

  // Shuffle drawpile
  public shuffleDrawPile(random: { shuffle: <T>(array: T[]) => T[] }): void {
    this.drawPile = random.shuffle(this.drawPile);
  }

  // Peek top x cards
  public peekTopCards(amount: number): Card[] {
    return this.drawPile.slice(-amount).reverse();
  }

  // Replace top x cards with new cards
  public replaceTopCards(newCards: Card[]): void {
    const amount = newCards.length;
    this.drawPile.splice(-amount, amount, ...newCards);
  }

  // Set the next player and how many turns they have to take
  public setNextPlayer(playerId: string, turns: number): void {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) {
      throw new Error(`Player with ID ${playerId} not found.`);
    }
    this.currentPlayerIndex = index;
    this.turnsRemaining = turns;
  }

  // Move cards from one players hand to another players hand
  public moveCardBetweenPlayers(fromPlayerId: string, toPlayerId: string, cardId: string): void {
    const fromPlayer = this.players.find(p => p.id === fromPlayerId);
    const toPlayer = this.players.find(p => p.id === toPlayerId);
    
    // Validate both players exist
    if (!fromPlayer || !toPlayer) {
      throw new Error(`One or both players not found.`);
    }

    // Get the card ad validate it exists in the fromPlayer's hand
    const cardIndex = fromPlayer.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      throw new Error(`Card with ID ${cardId} not found in player ${fromPlayerId}'s hand.`);
    }
    
    // Move the card from one player's hand to another
    const [card] = fromPlayer.hand.splice(cardIndex, 1);
    toPlayer.hand.push(card);
  }

  private cycleToNextActivePlayer(): void {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    } while (this.players[this.currentPlayerIndex].hasExploded && !this.isGameOver);
  }
}