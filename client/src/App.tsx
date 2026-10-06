import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Initialize socket outside the component to prevent reconnections on render
const socket: Socket = io('http://localhost:3000');

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    socket.on('serverMessage', (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('serverMessage');
    };
  }, []);

  const sendPing = () => {
    socket.emit('clientMessage', 'Hello World!');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">Exploding Kittens</h1>
      
      <button 
        onClick={sendPing}
        className="bg-indigo-600 hover:bg-indigo-500 transition-colors text-white font-bold py-2 px-6 rounded-lg mb-8"
      >
        Send Ping
      </button>
      
      <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-xl shadow-lg min-h-[300px]">
        <h2 className="text-gray-400 font-semibold mb-3 border-b border-gray-700 pb-2">Network Log</h2>
        <div className="flex flex-col gap-1">
          {messages.map((m, i) => (
            <div key={i} className="font-mono text-sm text-green-400">
              {m}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}