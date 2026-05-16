import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {AuthProvider} from './lib/auth/AuthContext';
import { supabase } from './lib/supabase/client';
import { configureRuntimeSupabaseUserStateStore } from './lib/persistence/supabaseUserStateStore';
import {registerServiceWorker} from './registerServiceWorker';

void registerServiceWorker({
  isProd: import.meta.env.PROD,
  serviceWorker:
    typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined,
});

configureRuntimeSupabaseUserStateStore(supabase);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
