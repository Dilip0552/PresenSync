import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { FirebaseProvider } from './FirebaseContext'; // Import FirebaseProvider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <FirebaseProvider> {/* Wrap App with FirebaseProvider */}
        <App />
      </FirebaseProvider>
    </BrowserRouter>
  </StrictMode>,
);
