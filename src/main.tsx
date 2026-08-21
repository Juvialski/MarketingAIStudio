import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installDemoAssetVersionObserver } from './utils/demoAssets';

// Start before React mounts so legacy/stale `/demo/*` image requests are
// versioned as soon as they enter the DOM. This does not touch real uploads.
installDemoAssetVersionObserver();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
