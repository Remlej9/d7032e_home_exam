// core/src/engine/GameEngine.ts
import { GameState } from '../models/GameState';
import { Player, Card } from '../models/Types';
import { ActionResolver } from './ActionResolver';
import { IEffectContext, IRandomProvider, IPlayerInput } from '../interfaces/IEffectContext';
import { ICardEffect } from '../expansions/ICardEffect';
import { DeckFactory } from './DeckFactory';

export type PendingAction = {
    cardType: string;
    context: IEffectContext;
    nopeCount: number;
  };

export class GameEngine {
  public state: GameState;
  private resolver: ActionResolver;
  private random: IRandomProvider;
  private input: IPlayerInput;
  private factory: DeckFactory;
  public hasStarted: boolean = false;

  private pendingAction: PendingAction | null = null;
  private interruptTimer: NodeJS.Timeout | null = null;
  private interruptResolver: ((value: boolean) => void) | null = null;

  // Callback for notifying state changes
  private onStateChange: (state: any) => void = () => {};

  constructor(random: IRandomProvider, input: IPlayerInput, onStateChange: (state: any) => void) {
    this.state = new GameState([]);
    this.resolver = new ActionResolver();
    this.random = random;
    this.input = input;
    this.factory = new DeckFactory();
    this.onStateChange = onStateChange;
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

    console.log(this.state.drawPile.map(c => c.type));

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
        console.log(`Player ${player.id} drew an Exploding Kitten but has a Defuse card.`);
        // Player has a defuse
        const defuseCard = player.hand.splice(defuseIndex, 1)[0];
        this.state.discardPile.push(defuseCard);

        this.onStateChange(this.getSnapshot());

        // Ask player where they want to place the Exploding Kitten back into the draw pile
        const insertionDepth = await this.input.promptDeckInsertion!(player.id, this.state.drawPile.length);
        
        const arrayIndex = this.state.drawPile.length - insertionDepth;
        this.state.drawPile.splice(arrayIndex, 0, drawnCard);

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
    const cardIndex = player?.hand.findIndex(c => c.id === cardId) ?? -1;
    if (!player || cardIndex === -1) throw new Error("Invalid card or player");

    const card = player.hand.splice(cardIndex, 1)[0];
    this.state.discardPile.push(card);

    // Handle nope cards during activation window
    if (card.type === 'Nope') {
      if (!this.pendingAction) {
        throw new Error("No action to nope");
      }
      this.pendingAction.nopeCount++;
      this.resetInterruptTimer();
      this.onStateChange(this.getSnapshot());
      return this.getSnapshot();
    }

    // Prevent normal cards from being played out of turn or during an interrupt
    if (this.pendingAction) throw new Error("Wait for the current action to resolve");
    if (this.state.currentPlayer.id !== playerId) throw new Error("Not your turn");

    const context: IEffectContext = {
      state: this.state,
      actingPlayerId: playerId,
      random: this.random,
      input: this.input
    };

    // Initialize the pending action before starting the timer
    this.pendingAction = { cardType: card.type, context, nopeCount: 0 };
    this.onStateChange(this.getSnapshot()); // Tell clients the Nope window is open

    const shouldExecute = await this.startInterruptWindow();

    if (shouldExecute) {
      await this.resolver.playCard(card.type, context);
    }
    
    // Clean up and tell clients the window is closed
    this.pendingAction = null;
    this.onStateChange(this.getSnapshot());
    
    return this.getSnapshot();
  }

  // Handles the 5-second interrupt window for actions
  private startInterruptWindow(): Promise<boolean> {
    return new Promise((resolve) => {
      this.interruptResolver = resolve;
      this.interruptTimer = setTimeout(() => this.resolveInterrupt(), 5000);
    });
  };

  private resetInterruptTimer() {
    if (this.interruptTimer) clearTimeout(this.interruptTimer);
    this.interruptTimer = setTimeout(() => this.resolveInterrupt(), 5000);
  };

  private resolveInterrupt() {
    if (!this.pendingAction || !this.interruptResolver) return;

    const isCanceled = this.pendingAction.nopeCount % 2 !== 0;
    this.interruptResolver(!isCanceled);
    this.interruptResolver = null;
  };

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
      hasStarted: this.hasStarted,
      pendingAction: this.pendingAction ? {
        cardType: this.pendingAction.cardType,
        nopeCount: this.pendingAction.nopeCount
      } : null
    };
  }
}