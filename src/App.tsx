import React from 'react';
import { GameProvider } from './context/GameContext';
import { GameLayout } from './components/GameLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <GameLayout />
      </GameProvider>
    </ErrorBoundary>
  );
}
