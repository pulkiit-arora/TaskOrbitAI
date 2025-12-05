import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('index.tsx: Attempting to mount app...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

console.log('index.tsx: Found root element, creating React root...');

const root = ReactDOM.createRoot(rootElement);
console.log('index.tsx: React root created, rendering App...');

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('index.tsx: App rendered');
