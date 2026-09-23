import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { offlineStorage } from './services/offlineStorageService';
import { offlineSyncService } from './services/offlineSyncService';

// Register Service Worker for offline support (bypassed in DEV mode to prevent /api/* interception)
if (import.meta.env.DEV) {
  // In development, unregister any existing service worker
  // so it does not intercept /api/* requests.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => regs.forEach(r => r.unregister()))
      .catch(() => { /* no-op */ });
  }
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch(() => { /* no-op */ });
  });
}

// Initialize offline storage
offlineStorage.initialize()
  .then(() => {
    console.log('✅ Offline storage initialized');
    offlineSyncService.registerListeners();
    
    // Initial sync if online
    if (navigator.onLine) {
      offlineSyncService.syncAll().then(result => {
        console.log(`✅ Initial sync: ${result.synced} items synced`);
      });
    }
  })
  .catch(error => {
    console.warn('⚠️ Offline storage not available:', error);
  });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
