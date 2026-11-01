import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GreenhouseProvider } from './context/GreenhouseContext';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <GreenhouseProvider>
        <App />
      </GreenhouseProvider>
    </BrowserRouter>
  </React.StrictMode>
);
