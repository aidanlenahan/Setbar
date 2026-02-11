import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Exercises from './pages/Exercises'
import Preferences from './pages/Preferences'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">🏋️ NessFitness</div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/exercises">Exercises</Link>
            <Link to="/history">History</Link>
            <Link to="/preferences">Preferences</Link>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/history" element={<div className="placeholder">History coming soon...</div>} />
            <Route path="/preferences" element={<Preferences />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
