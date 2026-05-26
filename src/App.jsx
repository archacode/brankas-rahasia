import React, { useState } from 'react';
import Gate from './Gate';
import Vault from './Vault';

function App() {
  // Tanpa memori penyimpanan. Jadi kalau di-refresh (F5), 
  // otomatis balik ke nilai 'false' (terkunci di Gate depan).
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <div>
      {isUnlocked ? (
        <Vault onLock={() => setIsUnlocked(false)} />
      ) : (
        <Gate onUnlock={() => setIsUnlocked(true)} />
      )}
    </div>
  );
}

export default App;