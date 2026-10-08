// core/src/engine/GameEngine.ts
import { GameState } from '../models/GameState';
import { Player, Card } from '../models/Types';
import { ActionResolver } from './ActionResolver';
import { IEffectContext, IRandomProvider, IPlayerInput } from '../interfaces/IEffectContext';
import { ICardEffect } from '../expansions/ICardEffect';
import { DeckFactory } from './DeckFactory';

export class GameEngine {
  public state: GameState;
  private resolver: ActionResolver;
  private random: IRandomProvider;
  private input: IPlayerInput;
  private factory: DeckFactory;
  public hasStarted: boolean = false;

  constructor(random: IRandomProvider, input: IPlayerInput) {
    this.state = new GameState([]);
    this.resolver = new ActionResolver();
    this.random = random;
    this.input = input;
    this.factory = new DeckFactory();
  }

  public startGame(): void {
    if (this.state.players.length < 2 || this.state.players.length > 5) {
      throw new Error("Game requires 2 to 5 players.");
    }

    // Create base deck and shuffle
    let deck = this.factory.createBaseDeck();
    deck = this.random.shuffle(deck);

    // Deal 1 Defuse and 7 regular cards to each player
    for (const player of this.state.players) {
      const defuse = this.factory.createDefuseCards(1)[0];
      player.hand.push(defuse);
      
      for (let i = 0; i < 7; i++) {
        const card = deck.pop();
        if (card) player.hand.push(card);
      }
    }

    // Add remaining Defuses and Exploding Kittens ínto the deck
    const defusesNeeded = this.state.players.length === 5 ? 1 : 2;
    deck.push(...this.factory.createDefuseCards(defusesNeeded));
    
    const kittensNeeded = this.state.players.length - 1;
    deck.push(...this.factory.createExplodingKittens(kittensNeeded));

    // Final shuffle
    this.state.drawPile = this.random.shuffle(deck);

    // Random player goes first
    this.state.currentPlayerIndex = this.random.getRandomInt(this.state.players.length);
    this.hasStarted = true;
  }

  // Logic for passing a turn
  public async passTurn(playerId: string): Promise<any> {
    if (!this.hasStarted) throw new Error("Game has not started");
    if (this.state.currentPlayer.id !== playerId) throw new Error("Not your turn");

    const player = this.state.currentPlayer;
    const drawnCard = this.state.drawPile.pop();

    if (!drawnCard) throw new Error("Draw pile is empty");

    if (drawnCard.type === 'ExplodingKitten') {
      const defuseIndex = player.hand.findIndex(c => c.type === 'Defuse');
      
      if (defuseIndex !== -1) {
        // Player has a defuse
        const defuseCard = player.hand.splice(defuseIndex, 1)[0];
        this.state.discardPile.push(defuseCard);
        
        // TÓDO: Let player place Exploding kitten back wherever they want
        this.state.drawPile.unshift(drawnCard);
      } else {
        // Player explodes
        player.hasExploded = true;
        this.state.discardPile.push(drawnCard);
        this.state.discardPile.push(...player.hand);
        player.hand = [];
      }
    } else {
      // Normal card drawn
      player.hand.push(drawnCard);
    }

    // Move to next turn/player
    this.state.moveNextTurn();

    return this.getSnapshot();
  }

  public registerExpansionCard(effect: ICardEffect): void {
    this.resolver.registerEffect(effect);
  }

  public addPlayer(id: string) {
    if (!this.state.players.find(p => p.id === id)) {
      const newPlayer: Player = { id, hand: [], hasExploded: false };
      this.state.players.push(newPlayer);
    }
    return this.getSnapshot();
  }

  // Play card logic
  public async playCard(playerId: string, cardId: string): Promise<any> {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) throw new Error("Player not found");
    if (this.state.currentPlayer.id !== playerId) throw new Error("Not your turn");

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) throw new Error("Card not found in hand");

    // Remove from hand, add to discard pile
    const card = player.hand.splice(cardIndex, 1)[0];
    this.state.discardPile.push(card);

    const context: IEffectContext = {
      state: this.state,
      actingPlayerId: playerId,
      random: this.random,
      input: this.input
    };

    // The resolver handles the specific logic for this card type
    await this.resolver.playCard(card.type, context);

    return this.getSnapshot();
  }

  public getSnapshot() {
    return {
      players: this.state.players.map(p => ({
        id: p.id,
        hand: p.hand,
        hasExploded: p.hasExploded
      })),
      deckCount: this.state.drawPile.length,
      discardCount: this.state.discardPile.length,
      currentPlayer: this.state.currentPlayer?.id,
      turnsRemaining: this.state.turnsRemaining,
      hasStarted: this.hasStarted
    };
  }
}