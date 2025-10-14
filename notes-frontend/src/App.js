import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import NotesDashboard from './pages/NotesDashboard';
import Register from './pages/Register';

function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem('token')));

  const handleLoginSuccess = () => setLoggedIn(true);
  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        <Route path="/register" element={loggedIn ? <Navigate to="/notes" /> : <Register onRegisterSuccess={() => {}} />} />
        <Route path="/login" element={loggedIn ? <Navigate to="/notes" /> : <Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/notes" element={loggedIn ? <NotesDashboard onLogout={handleLogout} /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={loggedIn ? "/notes" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
