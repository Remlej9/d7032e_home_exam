// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameEngine, AttackEffect, SkipEffect, ShuffleEffect, SeeTheFutureEffect, FavorEffect, TwoOfAKindEffect, ThreeOfAKindEffect } from 'exploding-kittens-core'; 

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

// Track active sockets
const activeSockets = new Map<string, Socket>();

const serverRandomizer = {
  shuffle: <T>(array: T[]) => array.sort(() => Math.random() - 0.5),
  getRandomInt: (max: number) => Math.floor(Math.random() * max)
};

const serverInputAdapter = {
  // Ask player to pick a target from a list of available targets
  promptTargetSelection: async (actingPlayerId: string, targets: string[]): Promise<string> => {
    return new Promise((resolve) => {
      const socket = activeSockets.get(actingPlayerId);
      if (!socket) return resolve(targets[0]); // Fallback if disconnected

      socket.emit('promptTargetSelection', targets);
      socket.once('targetSelected', (targetId: string) => resolve(targetId));
    });
  },
  
  // Ask player to select a card from their hand
  promptCardSelection: async (actingPlayerId: string, hand: any[]): Promise<string> => {
    return new Promise((resolve) => {
      const socket = activeSockets.get(actingPlayerId);
      if (!socket) return resolve(hand[0]); // Fallback if disconnected

      socket.emit('promptCardSelection', hand);
      socket.once('cardSelected', (cardId: string) => resolve(cardId));
    });
  },

  // Ask player to select a card type from a list of available types
  promptCardTypeSelection: async (actingPlayerId: string, types: string[]): Promise<string> => {
    return new Promise((resolve) => {
      const socket = activeSockets.get(actingPlayerId);
      if (!socket) return resolve(types[0]); // Fallback if disconnected

      socket.emit('promptCardTypeSelection', types);
      socket.once('cardTypeSelected', (type: string) => resolve(type));
    });
  },

  promptRearrangeCards: async (actingPlayerId: string, cards: string[]) => cards,
  promptDeckInsertion: async (actingPlayerId: string, maxIndex: number): Promise<number> => {
    return new Promise((resolve) => {
      const socket = activeSockets.get(actingPlayerId);
      if (!socket) return resolve(0); // Fallback if disconnected
          
      socket.emit('promptDeckInsertion', maxIndex);
      socket.once('deckInsertionSelected', (index: number) => resolve(index));
    });
  },

  promptActionInterrupt: async (timeoutMs: number) => false,

  // Send a private message to a specific player
  notifyPlayer: async (actingPlayerId: string, message: string, cards?: any[]) => {
    const cardNames = cards ? cards.map(card => card.name).join(', ') : '';
    const fullMessage = cardNames ? `${message} Cards: ${cardNames}` : message;

    io.to(actingPlayerId).emit('serverMessage', fullMessage);
  }
};

const engine = new GameEngine(serverRandomizer, serverInputAdapter, (state) => {
  io.emit('gameState', state);

  if (state.pendingAction) {
    const status = state.pendingAction.nopeCount % 2 === 0 ? "ACTION PENDING" : "ACTION NOPED";
    io.emit('serverMessage', `5-second interrupt window. Status: ${status}`);
  }
});

engine.registerExpansionCard(new AttackEffect());
engine.registerExpansionCard(new SkipEffect());
engine.registerExpansionCard(new ShuffleEffect());
engine.registerExpansionCard(new SeeTheFutureEffect());
engine.registerExpansionCard(new FavorEffect());
engine.registerExpansionCard(new TwoOfAKindEffect());
engine.registerExpansionCard(new ThreeOfAKindEffect());

io.on('connection', (socket) => {
  // Extract the persistent ID provided by the client
  const playerId = socket.handshake.query.playerId as string;
  
  if (!playerId) {
    socket.disconnect();
    return;
  }

  socket.join(playerId); // Join a room named after the player ID for private messages
  activeSockets.set(playerId, socket); // Track the active socket
  console.log(`Client connected: ${playerId} (Socket: ${socket.id})`);

  // Add player to engine
  const state = engine.addPlayer(playerId);
  
  // Send current state to the connecting client
  socket.emit('gameState', state);

  socket.on('startGame', () => {
    try {
      engine.startGame();
      io.emit('gameState', engine.getSnapshot());
      io.emit('serverMessage', 'The game has started!');
    } catch (e: any) {
      socket.emit('serverMessage', `Error: ${e.message}`);
    }
  });

  socket.on('passTurn', async () => {
    try {
      const newState = await engine.passTurn(playerId);
      io.emit('gameState', newState);
      io.emit('serverMessage', `Player ${playerId} drew a card and passed their turn.`);
    } catch (e: any) {
      socket.emit('serverMessage', `Error: ${e.message}`);
    }
  });

  socket.on('playCard', async (cardId: string) => {
    try {
      const newState = await engine.playCard(playerId, cardId);
      io.emit('gameState', newState);
    } catch (e: any) {
      socket.emit('serverMessage', `Error: ${e.message}`);
    }
  });

  socket.on('playCombo', async (cardIds: string[]) => {
    try {
      const newState = await engine.playCombo(playerId, cardIds);
      io.emit('gameState', newState);
    } catch (e: any) {
      socket.emit('serverMessage', `Error: ${e.message}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${playerId}`);
  });
});

httpServer.listen(3000, () => {
  console.log('Socket server running on port 3000');
});