import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return <main className="shell">
    <header><span className="mark">GRIDOPS</span><span className="mode">LOCAL SIMULATION</span></header>
    <section className="hero">
      <p className="eyebrow">SMART GRID ENERGY CONTROLLER</p>
      <h1>Energy Operations Center</h1>
      <p>The real-time industrial dashboard is being commissioned.</p>
    </section>
    <section className="cards">
      {['Telemetry Pipeline', 'Grid State', 'Virtual Breakers'].map((label) => <article key={label}><i></i><span>{label}</span><strong>INITIALIZING</strong></article>)}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);

