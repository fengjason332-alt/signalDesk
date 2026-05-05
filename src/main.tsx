import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerServiceWorker} from './registerServiceWorker';

void registerServiceWorker({
  isProd: import.meta.env.PROD,
  serviceWorker:
    typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
