// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import { FirebaseProvider } from './FirebaseContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <FirebaseProvider>
        <App />
      </FirebaseProvider>
    </Router>
  </React.StrictMode>
);
