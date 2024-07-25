import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

(() => {
  kintone.events.on('app.record.index.show', (event) => {
    const customView = Number(2784);
    if (event.viewId === customView) {
      let rootElement = document.querySelector('.root');
      if (!rootElement) {
        rootElement = document.createElement('div');
        rootElement.class = 'root';
        document.body.appendChild(rootElement);
      }
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }
    return event;
  });
})();