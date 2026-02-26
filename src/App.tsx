import { Link } from 'react-router-dom';
import RoutesView from './routes';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="badge">MVP</span>
          <strong>СПб: УК и зоны</strong>
        </div>

        <nav className="topbar__nav">
          <Link to="/">Карта</Link>
          <Link to="/admin">Админ</Link>
        </nav>
      </header>

      <main className="main">
        <RoutesView />
      </main>
    </div>
  );
}
