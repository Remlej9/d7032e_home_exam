import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

// Configure Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  const shortId = socket.id.substring(0, 4);
  console.log(`Client connected: ${shortId}`);

  // Broadcast to all clients that someone joined
  io.emit('serverMessage', `Player ${shortId} joined the lobby.`);

  // Listen for actions from the connected client and broadcast them
  socket.on('clientMessage', (msg) => {
    console.log(`Received from ${shortId}: ${msg}`);
    io.emit('serverMessage', `Player ${shortId} says: ${msg}`);
  });

  socket.on('disconnect', () => {
    io.emit('serverMessage', `Player ${shortId} disconnected.`);
  });
});

httpServer.listen(3000, () => {
  console.log('Socket server running on port 3000');
});