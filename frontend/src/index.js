import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // This connects that beautiful CSS you showed me!
import App from './App'; // This loads your actual app logic

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);