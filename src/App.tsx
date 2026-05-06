import React from 'react';
import { GameProvider } from './context/GameContext';
import { GameLayout } from './components/GameLayout';

export default function App() {
  return (
    <GameProvider>
      <GameLayout />
    </GameProvider>
  );
}
