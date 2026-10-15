// core/tests/GameEngine.test.ts
import { GameEngine } from '../src/engine/GameEngine';
import { IPlayerInput, IRandomProvider } from '../src/interfaces/IEffectContext';
import { Card } from '../src/models/Types';
import { SkipEffect } from '../src/expansions/base/SkipEffect';
import { AttackEffect } from '../src/expansions/base/AttackEffect';
import { TwoOfAKindEffect } from '../src/expansions/base/TwoOfAKindEffect';
import { FavorEffect } from '../src/expansions/base/FavorEffect';
import { ShuffleEffect } from '../src/expansions/base/ShuffleEffect';
import { SeeTheFutureEffect } from '../src/expansions/base/SeeTheFutureEffect';
import { ThreeOfAKindEffect } from '../src/expansions/base/ThreeOfAKindEffect';

describe('GameEngine', () => {
  let engine: GameEngine;
  let mockInput: jest.Mocked<IPlayerInput>;
  let mockRandom: jest.Mocked<IRandomProvider>;
  let mockOnStateChange: jest.Mock;

  beforeEach(() => {
    mockInput = {
      promptTargetSelection: jest.fn(),
      promptCardSelection: jest.fn(),
      promptCardTypeSelection: jest.fn(),
      promptRearrangeCards: jest.fn(),
      promptDeckInsertion: jest.fn().mockResolvedValue(0), // Always put on top
      promptActionInterrupt: jest.fn().mockResolvedValue(true),
      notifyPlayer: jest.fn(),
      broadcastMessage: jest.fn(),
    };

    mockRandom = {
      // Deterministic shuffle: just reverse the array for testing
      shuffle: jest.fn((arr: any[]) => arr.reverse()) as any,
      getRandomInt: jest.fn().mockReturnValue(0), // Always pick index 0
    };

    mockOnStateChange = jest.fn();

    engine = new GameEngine(mockRandom, mockInput, mockOnStateChange);
    engine.registerExpansionCard(new SkipEffect());
    engine.registerExpansionCard(new AttackEffect());
    engine.registerExpansionCard(new TwoOfAKindEffect());
    engine.registerExpansionCard(new FavorEffect());
  	engine.registerExpansionCard(new ShuffleEffect());
  	engine.registerExpansionCard(new SeeTheFutureEffect());
  	engine.registerExpansionCard(new ThreeOfAKindEffect());
    
    engine.addPlayer('Player1');
    engine.addPlayer('Player2');
  });

  test('Game setup distributes correct cards and inserts Exploding Kittens', () => {
    engine.startGame();
    
    expect(engine.state.players.length).toBe(2);
    
    // Each player gets 1 Defuse and 7 other cards
    engine.state.players.forEach(player => {
      expect(player.hand.length).toBe(8);
      expect(player.hand.filter(c => c.type === 'Defuse').length).toBe(1);
    });

    // For 2 players, there should be exactly 1 Exploding Kitten in the deck
    const explodingKittensInDeck = engine.state.drawPile.filter(c => c.type === 'ExplodingKitten').length;
    expect(explodingKittensInDeck).toBe(1);
  });

  test('Passing a turn draws a normal card', async () => {
    engine.startGame();
    
    // Force the top card to be a normal card (Skip)
    engine.state.drawPile.push({ id: 'skip-1', type: 'Skip', name: 'Skip' });
    
    const currentPlayer = engine.state.currentPlayer;
    const initialHandSize = currentPlayer.hand.length;

    await engine.passTurn(currentPlayer.id);

    // Player should have one more card
    expect(currentPlayer.hand.length).toBe(initialHandSize + 1);
    expect(engine.state.currentPlayer.id).not.toBe(currentPlayer.id); // Turn moved to next player
  });

  test('Drawing an Exploding Kitten with a Defuse card saves the player', async () => {
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    
    // Ensure player has a Defuse
    currentPlayer.hand.push({ id: 'defuse-1', type: 'Defuse', name: 'Defuse' });
    const initialDefuseCount = currentPlayer.hand.filter(c => c.type === 'Defuse').length;

    // Force top card to be an Exploding Kitten
    engine.state.drawPile.push({ id: 'ek-1', type: 'ExplodingKitten', name: 'Exploding Kitten' });

    await engine.passTurn(currentPlayer.id);

    expect(currentPlayer.hasExploded).toBe(false);
    expect(currentPlayer.hand.filter(c => c.type === 'Defuse').length).toBe(initialDefuseCount - 1);
    
    // The kitten should be placed back into the draw pile (mock Input resolves to index 0)
    expect(engine.state.drawPile[engine.state.drawPile.length - 1].type).toBe('ExplodingKitten');
  });

  test('Drawing an Exploding Kitten without a Defuse eliminates the player and announces winner', async () => {
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    
    // Remove all Defuse cards from the player's hand
    currentPlayer.hand = currentPlayer.hand.filter(c => c.type !== 'Defuse');

    // Force top card to be an Exploding Kitten
    engine.state.drawPile.push({ id: 'ek-2', type: 'ExplodingKitten', name: 'Exploding Kitten' });

    await engine.passTurn(currentPlayer.id);

    expect(currentPlayer.hasExploded).toBe(true);
    expect(currentPlayer.hand.length).toBe(0); // Hand discarded
    expect(engine.state.isGameOver).toBe(true);
    
    // Verify Winner Announcement
    const expectedWinnerId = engine.state.activePlayers[0].id;
    expect(mockInput.broadcastMessage).toHaveBeenCalledWith(`Game Over! Player ${expectedWinnerId} has won the game!`);
  });

  test('Playing a Skip card bypasses drawing', async () => {
    // Enable fake timers
    jest.useFakeTimers();
    
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    
    const skipCard: Card = { id: 'skip-test', type: 'Skip', name: 'Skip' };
    currentPlayer.hand.push(skipCard);

    const initialDrawPileSize = engine.state.drawPile.length;

    // Start the playCard execution
    const playPromise = engine.playCard(currentPlayer.id, skipCard.id);

    // Await the async timer fast-forward (flushes promises AND advances time)
    await jest.runAllTimersAsync();

    // Await the final resolution
    await playPromise;

    // Draw pile should not decrease because player skipped drawing
    expect(engine.state.drawPile.length).toBe(initialDrawPileSize);
    
    // Discard pile should receive the Skip card
    expect(engine.state.discardPile.some(c => c.id === skipCard.id)).toBe(true);
    
    // Turn should advance
    expect(engine.state.currentPlayer.id).not.toBe(currentPlayer.id);

    // Clean up timers
    jest.useRealTimers();
  });

  test('Rule 1: Game requires 2 to 5 players', () => {
    const singlePlayerEngine = new GameEngine(mockRandom, mockInput, mockOnStateChange);
    singlePlayerEngine.addPlayer('Player1');
    expect(() => singlePlayerEngine.startGame()).toThrow("Game requires 2 to 5 players.");

    const sixPlayerEngine = new GameEngine(mockRandom, mockInput, mockOnStateChange);
    for (let i = 1; i <= 6; i++) sixPlayerEngine.addPlayer(`Player${i}`);
    expect(() => sixPlayerEngine.startGame()).toThrow("Game requires 2 to 5 players.");
  });

  test('Rule 11a: Playing an Attack card forces the next player to take 2 turns', async () => {
    jest.useFakeTimers();
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    
    currentPlayer.hand.push({ id: 'attack-1', type: 'Attack', name: 'Attack' });
    
    const playPromise = engine.playCard(currentPlayer.id, 'attack-1');
    await jest.runAllTimersAsync();
    await playPromise;

    // Turn should move to the next player, and they should have 2 turns remaining
    expect(engine.state.currentPlayer.id).not.toBe(currentPlayer.id);
    expect(engine.state.turnsRemaining).toBe(2);
    jest.useRealTimers();
  });

  test('Rule 11f: Playing two of a kind steals a random card', async () => {
    jest.useFakeTimers();
    engine.startGame();
    
    const currentPlayer = engine.state.players[0];
    const targetPlayer = engine.state.players[1];
    
    // Give current player two matching Cat cards
    currentPlayer.hand.push({ id: 'cat-1', type: 'CatCard', name: 'Tacocat' });
    currentPlayer.hand.push({ id: 'cat-2', type: 'CatCard', name: 'Tacocat' });
    
    // Give target player a specific card to steal
    const cardToSteal: Card = { id: 'steal-me', type: 'Defuse', name: 'Defuse' };
    targetPlayer.hand = [cardToSteal];

    // Mock input selection
    mockInput.promptTargetSelection.mockResolvedValue(targetPlayer.id);

    const initialHandSize = currentPlayer.hand.length;
    
    const playPromise = engine.playCombo(currentPlayer.id, ['cat-1', 'cat-2']);
    await jest.runAllTimersAsync();
    await playPromise;

    // Current player played 2 cards (-2) and stole 1 (+1) = net -1
    expect(currentPlayer.hand.length).toBe(initialHandSize - 1);
    expect(currentPlayer.hand.some(c => c.id === 'steal-me')).toBe(true);
    expect(targetPlayer.hand.length).toBe(0);
    
    jest.useRealTimers();
  });

  test('Rule 12: A Nope card cancels an action', async () => {
    jest.useFakeTimers();
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    const targetPlayer = engine.state.players.find(p => p.id !== currentPlayer.id)!;
    
    // Give current player an Attack
    currentPlayer.hand.push({ id: 'attack-2', type: 'Attack', name: 'Attack' });
    // Give target player a Nope
    targetPlayer.hand.push({ id: 'nope-1', type: 'Nope', name: 'Nope' });

    // 1. Current player plays Attack
    const attackPromise = engine.playCard(currentPlayer.id, 'attack-2');
    
    // 2. IMPORTANT: Let the async engine process the card and open the 5-second Nope window
    await jest.advanceTimersByTimeAsync(100);
    
    // 3. Now target player plays Nope
    await engine.playCard(targetPlayer.id, 'nope-1');

    // 4. Fast forward the rest of the 5-second timer
    await jest.runAllTimersAsync();
    await attackPromise;

    // The attack should be canceled, meaning turnsRemaining should still be 1
    // and the turn should NOT have advanced
    expect(engine.state.turnsRemaining).toBe(1);
    expect(engine.state.currentPlayer.id).toBe(currentPlayer.id);
    expect(engine.state.discardPile.some(c => c.id === 'nope-1')).toBe(true);

    jest.useRealTimers();
  });

  test('Rule 3: Deck contains the exact specified card counts', () => {
    engine.startGame();
    
    // Combine all cards in the game (draw pile + player hands)
    const allCards = [
      ...engine.state.drawPile,
      ...engine.state.players.flatMap(p => p.hand)
    ];

    const countType = (type: string) => allCards.filter(c => c.type === type).length;
    const countName = (name: string) => allCards.filter(c => c.name === name).length;

    expect(countType('Attack')).toBe(4);
    expect(countType('Favor')).toBe(4);
    expect(countType('Nope')).toBe(5);
    expect(countType('Shuffle')).toBe(4);
    expect(countType('Skip')).toBe(4);
    expect(countType('SeeTheFuture')).toBe(5);
    
    // Cat cards (4 of each)
    expect(countName('Hairy Potato Cat')).toBe(4);
    expect(countName('Cattermelon')).toBe(4);
    expect(countName('Rainbow-Ralphing Cat')).toBe(4);
    expect(countName('Tacocat')).toBe(4);
    expect(countName('Overweight Bikini Cat')).toBe(4);
  });

  test('Rule 11b: Playing a Favor card forces another player to give you a card', async () => {
    jest.useFakeTimers();
    engine.startGame();
    
    const currentPlayer = engine.state.players[0];
    const targetPlayer = engine.state.players[1];
    
    currentPlayer.hand.push({ id: 'favor-1', type: 'Favor', name: 'Favor' });
    const cardToGive: Card = { id: 'give-me', type: 'Defuse', name: 'Defuse' };
    targetPlayer.hand = [cardToGive];

    mockInput.promptTargetSelection.mockResolvedValue(targetPlayer.id);
    mockInput.promptCardSelection.mockResolvedValue('give-me');

    const initialCurrentHandSize = currentPlayer.hand.length;
    
    const playPromise = engine.playCard(currentPlayer.id, 'favor-1');
    await jest.runAllTimersAsync();
    await playPromise;

    // Current player played Favor (-1) and received a card (+1) = net 0
    expect(currentPlayer.hand.length).toBe(initialCurrentHandSize);
    expect(currentPlayer.hand.some(c => c.id === 'give-me')).toBe(true);
    expect(targetPlayer.hand.length).toBe(0);

    jest.useRealTimers();
  });

  test('Rule 11c: Playing a Shuffle card shuffles the deck', async () => {
    jest.useFakeTimers();
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    
    currentPlayer.hand.push({ id: 'shuffle-1', type: 'Shuffle', name: 'Shuffle' });
    
    // Clear previous mock calls from setup
    mockRandom.shuffle.mockClear();

    const playPromise = engine.playCard(currentPlayer.id, 'shuffle-1');
    await jest.runAllTimersAsync();
    await playPromise;

    expect(mockRandom.shuffle).toHaveBeenCalled();
    expect(engine.state.discardPile.some(c => c.id === 'shuffle-1')).toBe(true);

    jest.useRealTimers();
  });

  test('Rule 11e: Playing See The Future reveals the top 3 cards', async () => {
    jest.useFakeTimers();
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    
    currentPlayer.hand.push({ id: 'stf-1', type: 'SeeTheFuture', name: 'See The Future' });
    
    const topCards = engine.state.drawPile.slice(-3).reverse();

    const playPromise = engine.playCard(currentPlayer.id, 'stf-1');
    await jest.runAllTimersAsync();
    await playPromise;

    expect(mockInput.notifyPlayer).toHaveBeenCalledWith(
      currentPlayer.id,
      'You see the future!',
      topCards
    );

    jest.useRealTimers();
  });

  test('Rule 11g: Playing three of a kind allows you to name and steal a card', async () => {
    jest.useFakeTimers();
    engine.startGame();
    
    const currentPlayer = engine.state.players[0];
    const targetPlayer = engine.state.players[1];
    
    // Give current player three matching Cat cards
    currentPlayer.hand.push({ id: 'cat-1', type: 'CatCard', name: 'Tacocat' });
    currentPlayer.hand.push({ id: 'cat-2', type: 'CatCard', name: 'Tacocat' });
    currentPlayer.hand.push({ id: 'cat-3', type: 'CatCard', name: 'Tacocat' });
    
    const cardToSteal: Card = { id: 'defuse-target', type: 'Defuse', name: 'Defuse' };
    targetPlayer.hand = [cardToSteal];

    mockInput.promptTargetSelection.mockResolvedValue(targetPlayer.id);
    mockInput.promptCardTypeSelection.mockResolvedValue('Defuse');

    const initialHandSize = currentPlayer.hand.length;
    
    const playPromise = engine.playCombo(currentPlayer.id, ['cat-1', 'cat-2', 'cat-3']);
    await jest.runAllTimersAsync();
    await playPromise;

    // Current player played 3 cards (-3) and stole 1 (+1) = net -2
    expect(currentPlayer.hand.length).toBe(initialHandSize - 2);
    expect(currentPlayer.hand.some(c => c.id === 'defuse-target')).toBe(true);
    expect(targetPlayer.hand.length).toBe(0);
    
    jest.useRealTimers();
  });

  test('Rule 11a (Edge Case): Attack cards stack turns when played sequentially', async () => {
    jest.useFakeTimers();
    engine.startGame();
    
    // Hardcode 3 players to test the passing of turns
    engine.state.players = [
      { id: 'Player1', hand: [], hasExploded: false },
      { id: 'Player2', hand: [], hasExploded: false },
      { id: 'Player3', hand: [], hasExploded: false }
    ];
    engine.state.currentPlayerIndex = 0; // Force Player1 to start

    const p1 = engine.state.players[0];
    const p2 = engine.state.players[1];

    p1.hand.push({ id: 'attack-1', type: 'Attack', name: 'Attack' });
    p2.hand.push({ id: 'attack-2', type: 'Attack', name: 'Attack' });

    // Player 1 plays Attack -> Player 2 gets 2 turns
    const p1Attack = engine.playCard(p1.id, 'attack-1');
    await jest.runAllTimersAsync();
    await p1Attack;

    expect(engine.state.currentPlayer.id).toBe(p2.id);
    expect(engine.state.turnsRemaining).toBe(2);

    // Player 2 plays Attack to defend -> Player 3 should get 2 + 2 = 4 turns
    const p2Attack = engine.playCard(p2.id, 'attack-2');
    await jest.runAllTimersAsync();
    await p2Attack;

    expect(engine.state.currentPlayer.id).toBe('Player3');
    expect(engine.state.turnsRemaining).toBe(4);

    jest.useRealTimers();
  });

  test('Rule 11d (Edge Case): Skip only cancels 1 turn if a player has multiple turns', async () => {
    jest.useFakeTimers();
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    
    // Manually give the player 2 turns (e.g., from an Attack)
    engine.state.turnsRemaining = 2;
    
    currentPlayer.hand.push({ id: 'skip-multi', type: 'Skip', name: 'Skip' });
    
    const playPromise = engine.playCard(currentPlayer.id, 'skip-multi');
    await jest.runAllTimersAsync();
    await playPromise;

    // It should STILL be the current player's turn, but with 1 turn remaining
    expect(engine.state.currentPlayer.id).toBe(currentPlayer.id);
    expect(engine.state.turnsRemaining).toBe(1);

    jest.useRealTimers();
  });

  test('Rule 12 (Edge Case): A Nope card played on another Nope creates a Yup', async () => {
    jest.useFakeTimers();
    engine.startGame();
    const currentPlayer = engine.state.currentPlayer;
    const targetPlayer = engine.state.players.find(p => p.id !== currentPlayer.id)!;
    
    currentPlayer.hand.push({ id: 'attack-yup', type: 'Attack', name: 'Attack' });
    targetPlayer.hand.push({ id: 'nope-1', type: 'Nope', name: 'Nope' });
    currentPlayer.hand.push({ id: 'nope-2', type: 'Nope', name: 'Nope' });

    // Current player plays Attack
    const attackPromise = engine.playCard(currentPlayer.id, 'attack-yup');
    await jest.advanceTimersByTimeAsync(100);
    
    // Target player plays Nope
    const nope1Promise = engine.playCard(targetPlayer.id, 'nope-1');
    await jest.advanceTimersByTimeAsync(100);

    // Current player counters with another Nope (creating a "Yup")
    await engine.playCard(currentPlayer.id, 'nope-2');

    // Fast forward
    await jest.runAllTimersAsync();
    await attackPromise;
    await nope1Promise;

    // The attack should resolve because the Nope was Noped.
    // Turn should move to target player with 2 turns.
    expect(engine.state.currentPlayer.id).toBe(targetPlayer.id);
    expect(engine.state.turnsRemaining).toBe(2);

    jest.useRealTimers();
  });
});