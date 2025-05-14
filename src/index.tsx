import React from 'react';
import ReactDOM from 'react-dom/client';
import ProbCalc from './ProbCalc';

const rootElement : any = document.getElementById('root');
const root : ReactDOM.Root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ProbCalc />
  </React.StrictMode>
);
