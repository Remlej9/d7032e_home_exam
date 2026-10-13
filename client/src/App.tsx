// client/src/App.tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Retrieve or generate a persistent Player ID
const getPersistentId = () => {
  let id = localStorage.getItem('exploding_kittens_id');
  if (!id) {
    id = Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem('exploding_kittens_id', id);
  }
  return id;
};

const persistentId = getPersistentId();

// Pass the ID in the socket connection query
const socket: Socket = io('http://localhost:3000', {
  query: { playerId: persistentId }
});

interface Card {
  id: string;
  type: string;
  name: string;
}

interface Player {
  id: string;
  hand: Card[];
  hasExploded: boolean;
}

interface GameState {
  players: Player[];
  deckCount: number;
  discardCount: number;
  currentPlayer: string;
  turnsRemaining: number;
  hasStarted: boolean;
  pendingAction: { cardType: string; nopeCount: number } | null;
}

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const [targetOptions, setTargetOptions] = useState<string[] | null>(null);
  const [cardOptions, setCardOptions] = useState<Card[] | null>(null);
  const [cardTypeOptions, setCardTypeOptions] = useState<string[] | null>(null);

  const [deckInsertionMax, setDeckInsertionMax] = useState<number | null>(null);
  const [insertionSliderValue, setInsertionSliderValue] = useState<number>(0);

  // Track selected cards for combo plays
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  // Initialize state directly with the persistent ID
  const [myId] = useState<string>(persistentId);

  useEffect(() => {
    socket.on('serverMessage', (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('gameState', (state: GameState) => {
      setGameState(state);
    });

    socket.on('promptTargetSelection', (targets: string[]) => {
      setTargetOptions(targets);
    });

    socket.on('promptCardSelection', (hand: Card[]) => {
      setCardOptions(hand);
    });

    socket.on('promptCardTypeSelection', (types: string[]) => {
      setCardTypeOptions(types);
    });

    socket.on('promptDeckInsertion', (maxIndex: number) => {
      setDeckInsertionMax(maxIndex);
      setInsertionSliderValue(0);
    });

    return () => {
      socket.off('serverMessage');
      socket.off('gameState');
      socket.off('promptTargetSelection');
      socket.off('promptCardSelection')
      socket.off('promptCardTypeSelection');
      socket.off('promptDeckInsertion');
    };
  }, []);

  const startGame = () => socket.emit('startGame');
  const passTurn = () => {
    setSelectedCards([]);
    socket.emit('passTurn');
  };

  const toggleCardSelection = (cardId: string) => {
    const clickedCard = me?.hand.find(c => c.id === cardId);
    if (!clickedCard) return;

    setSelectedCards(prev => {
      // Deselect if already selected
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }

      // If nothing is selected, start a new selection
      if (prev.length === 0) {
        return [cardId];
      }

      // If something is selected, check if the types match for a combo
      const firstSelectedCard = me?.hand.find(c => c.id === prev[0]);
      if (firstSelectedCard && firstSelectedCard.name === clickedCard.name) {
        return [...prev, cardId]; // Add to combo
      } else {
        return [cardId]; // Replace selection with the new card type
      }
    });
  };

  const executePlay = () => {
    if (selectedCards.length === 1) {
      socket.emit('playCard', selectedCards[0]);
    } else if (selectedCards.length > 1) {
      socket.emit('playCombo', selectedCards);
    }
    setSelectedCards([]);
  };

  const selectTarget = (targetId: string) => {
    socket.emit('targetSelected', targetId);
    setTargetOptions(null);
  };

  const selectCardToGive = (cardId: string) => {
    socket.emit('cardSelected', cardId);
    setCardOptions(null);
  };

  const selectCardType = (type: string) => {
    socket.emit('cardTypeSelected', type);
    setCardTypeOptions(null);
  };

  const selectDeckInsertion = (index: number) => {
    socket.emit('deckInsertionSelected', index);
    setDeckInsertionMax(null);
  };

  if (!gameState) return <div className="p-8 text-white">Connecting to server...</div>;

  const me = gameState.players.find(p => p.id === myId);
  const isMyTurn = gameState.currentPlayer === myId;

  const isInterruptActive = gameState.pendingAction !== null;
  const isActionNoped = isInterruptActive && (gameState.pendingAction!.nopeCount % 2 !== 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2">Exploding Kittens Engine</h1>
      <p className="text-gray-400 mb-6">You are Player: <span className="font-mono text-indigo-400">{myId}</span></p>
      
      {/* Board State */}
      <div className="flex gap-8 mb-8 text-lg font-bold bg-gray-800 p-6 rounded-xl border border-gray-700 w-full max-w-3xl justify-between">
        <div>
          <div className="text-sm text-gray-400">Status</div>
          {gameState.hasStarted ? (
            <span className="text-green-400">Active Game</span>
          ) : (
            <span className="text-yellow-400">Waiting in Lobby</span>
          )}
        </div>
        <div>
          <div className="text-sm text-gray-400">Players</div>
          {gameState.players.length} / 5
        </div>
        <div>
          <div className="text-sm text-gray-400">Draw Pile</div>
          {gameState.deckCount} cards
        </div>
        <div>
          <div className="text-sm text-gray-400">Current Turn</div>
          <span className={isMyTurn ? "text-indigo-400" : ""}>
            {gameState.currentPlayer || 'None'}
          </span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex gap-4 mb-8">
        {!gameState.hasStarted && (
          <button onClick={startGame} className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Start Game
          </button>
        )}
        {gameState.hasStarted && isMyTurn && !me?.hasExploded && (
          <button onClick={passTurn} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Pass (Draw Card)
          </button>
        )}
      </div>

      {/* Interactive Overlays */}
      {targetOptions && (
        <div className="w-full max-w-4xl mb-8 p-6 bg-indigo-900 border-2 border-indigo-500 rounded-xl shadow-2xl flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4 text-white">Choose a player to target:</h2>
          <div className="flex gap-4">
            {targetOptions.map(targetId => (
              <button 
                key={targetId} 
                onClick={() => selectTarget(targetId)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Player {targetId}
              </button>
            ))}
          </div>
        </div>
      )}

      {cardOptions && (
        <div className="w-full max-w-4xl mb-8 p-6 bg-red-900 border-2 border-red-500 rounded-xl shadow-2xl flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4 text-white">You must give a card! Choose one:</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            {cardOptions.map(card => (
              <button 
                key={card.id} 
                onClick={() => selectCardToGive(card.id)}
                className="bg-gray-800 hover:bg-gray-700 border border-red-400 text-white font-bold p-4 w-32 rounded-lg transition-colors flex items-center justify-center text-sm text-center"
              >
                {card.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {cardTypeOptions && (
        <div className="w-full max-w-4xl mb-8 p-6 bg-purple-900 border-2 border-purple-500 rounded-xl shadow-2xl flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4 text-white">Name a card type to steal:</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            {cardTypeOptions.map(type => (
              <button 
                key={type} 
                onClick={() => selectCardType(type)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md"
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {deckInsertionMax !== null && (
        <div className="w-full max-w-4xl mb-8 p-6 bg-red-900 border-2 border-red-500 rounded-xl shadow-2xl flex flex-col items-center">
          <h2 className="text-xl font-bold mb-6 text-white">You Defused the Kitten! Where do you want to hide it?</h2>
          
          <div className="w-full max-w-md flex flex-col items-center gap-4">
            <div className="flex justify-between w-full text-red-200 font-bold text-sm">
              <span>Top (0)</span>
              <span>Position: {insertionSliderValue}</span>
              <span>Bottom ({deckInsertionMax})</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max={deckInsertionMax} 
              value={insertionSliderValue}
              onChange={(e) => setInsertionSliderValue(Number(e.target.value))}
              className="w-full h-3 bg-red-950 rounded-lg appearance-none cursor-pointer accent-red-500"
            />

            <button 
              onClick={() => selectDeckInsertion(insertionSliderValue)} 
              className="mt-4 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-colors"
            >
              Confirm Placement
            </button>
          </div>
        </div>
      )}

      {/* Player Hand */}
      {gameState.hasStarted && me && (
        <div className="w-full max-w-4xl mb-8">
          <div className="flex justify-between items-center mb-4 h-12">
            <h2 className="text-xl font-bold">Your Hand {me.hasExploded && <span className="text-red-500">(EXPLODED)</span>}</h2>
            
            {/* Dynamic Master Action Button */}
            {selectedCards.length > 0 && !isInterruptActive && (
              <button 
                onClick={executePlay}
                className="bg-green-500 hover:bg-green-400 text-black font-bold py-2 px-6 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all"
              >
                {selectedCards.length === 1 
                  ? `Play ${me.hand.find(c => c.id === selectedCards[0])?.name}` 
                  : `Play ${selectedCards.length}-Card Combo`
                }
              </button>
            )}
          </div>
          
          {isInterruptActive && (
            <div className={`mb-4 p-3 rounded-lg text-center font-bold ${isActionNoped ? 'bg-red-900 text-red-200' : 'bg-yellow-600 text-white'}`}>
              Interrupt Window Active! 
              {isActionNoped ? ' Action is currently noped' : ' Play a Nope'}
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            {me.hand.map((card) => {
              const isNopeCard = card.type === 'Nope';
              const isPlayable = isInterruptActive ? isNopeCard : (isMyTurn && !me.hasExploded && card.type !== 'Defuse');
              const isSelected = selectedCards.includes(card.id);

              const firstSelected = selectedCards.length > 0 
                ? me.hand.find(c => c.id === selectedCards[0]) 
                : null;
              
              // Determine combo highlighting states
              const activeSelectionName = firstSelected?.name;

              const isMatchable = activeSelectionName && card.name === activeSelectionName && !isSelected;
              const isUnmatchable = activeSelectionName && card.name !== activeSelectionName;

              // Selection Highlighting
              let cardStyle = 'bg-gray-800 border-gray-600 shadow-lg cursor-pointer hover:bg-gray-700';
              
              if (isSelected) {
                cardStyle = 'bg-indigo-900 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.6)] transform -translate-y-2';
              } else if (isMatchable) {
                cardStyle = 'bg-gray-700 border-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.3)] cursor-pointer'; 
              } else if (isUnmatchable) {
                cardStyle = 'bg-gray-900 border-gray-800 opacity-40 cursor-pointer'; 
              }
              
              if (isInterruptActive) {
                cardStyle = isNopeCard 
                  ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,1)] border-yellow-300 transform scale-105 cursor-pointer' 
                  : 'bg-gray-800 opacity-30 cursor-not-allowed';
              }

              return (
                <div 
                  key={card.id} 
                  onClick={() => {
                    if (isPlayable) toggleCardSelection(card.id);
                    if (isInterruptActive && isNopeCard) socket.emit('playCard', card.id);
                  }}
                  className={`border p-4 rounded-lg w-32 flex flex-col items-center transition-all select-none ${cardStyle}`}
                >
                  <div className="text-center font-semibold mb-2 text-sm h-12 flex items-center">{card.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Network Log */}
      <div className="w-full max-w-4xl bg-gray-800 p-4 rounded-xl shadow-lg min-h-[200px] max-h-[300px] overflow-y-auto">
        <h2 className="text-gray-400 font-semibold mb-3 border-b border-gray-700 pb-2">Event Log</h2>
        <div className="flex flex-col gap-1">
          {messages.map((m, i) => (
            <div key={i} className="font-mono text-sm text-green-400">{m}</div>
          ))}
        </div>
      </div>
    </div>
  );
}