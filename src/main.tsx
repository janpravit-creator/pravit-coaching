import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { wendeAn } from './lib/theme';
import './styles/theme.css';

// Vor dem ersten Rendern anwenden, damit die Seite nicht kurz hell aufblitzt.
wendeAn();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Wurzelelement #root nicht gefunden');

createRoot(rootEl).render(
  <StrictMode>
    {/* BrowserRouter mit saubereren Adressen; netlify.toml leitet alle Pfade
        auf index.html, damit ein Neuladen auf einer Unterseite funktioniert. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
