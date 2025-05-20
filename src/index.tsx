import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ProbCalc from './ProbCalc';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProbCalc />
  </StrictMode>
);
