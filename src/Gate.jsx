import React, { useState } from 'react';
import './Gate.css';

function Gate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // --- PASSWORD UTAMA MASUK WEB ---
    const KUNCI_RAHASIA = "kontol"; 
    
    if (password === KUNCI_RAHASIA) {
      setError('');
      if (onUnlock) onUnlock(); // Panggil fungsi login ke App.jsx
    } else {
      setError('Kunci akses salah atau tidak dikenali.');
      setPassword(''); 
    }
  };

  return (
    <div className="gate-container">
      <div className="gate-box">
        
        <div className="logo-container">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="11" width="14" height="10" rx="2" ry="2"></rect>
            <path d="M8 11V7a4 4 0 0 1 8 0v4"></path>
            <circle cx="12" cy="15" r="1"></circle>
            <path d="M12 16v2"></path>
            <path d="M21 2l-4.5 4.5"></path>
            <circle cx="22" cy="3" r="1.5"></circle>
            <path d="M18.5 6.5L17 5"></path>
          </svg>
          <h1 className="logo-text">LOCKLOCK</h1>
          <div className="logo-subtext">Secure Digital Vault</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="password" 
              className="password-input"
              placeholder="Masukkan Kunci..." 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          
          <button type="submit" className="btn-unlock">
            Buka Brankas 
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
          </button>
          
          <div className="error-msg">{error}</div>
        </form>

      </div>
    </div>
  );
}

export default Gate;