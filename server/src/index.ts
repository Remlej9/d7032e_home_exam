// server/src/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameEngine, AttackEffect, SkipEffect, ShuffleEffect } from 'exploding-kittens-core'; 

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

const serverRandomizer = {
  shuffle: <T>(array: T[]) => array.sort(() => Math.random() - 0.5),
  getRandomInt: (max: number) => Math.floor(Math.random() * max)
};

const serverInputAdapter = {
  promptTargetSelection: async (actingPlayerId: string, targets: string[]) => targets[0],
  promptCardSelection: async (actingPlayerId: string, hand: string[]) => hand[0],
  promptRearrangeCards: async (actingPlayerId: string, cards: string[]) => cards,
  promptDeckInstertion: async (actingPlayerId: string, maxIndex: number) => [0],
  promptActionInterrupt: async (timeoutMs: number) => false
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

io.on('connection', (socket) => {
  // Extract the persistent ID provided by the client
  const playerId = socket.handshake.query.playerId as string;
  
  if (!playerId) {
    socket.disconnect();
    return;
  }

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

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${playerId}`);
  });
});

httpServer.listen(3000, () => {
  console.log('Socket server running on port 3000');
});