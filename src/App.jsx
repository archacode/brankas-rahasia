import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Gate from './Gate';
import Vault from './Vault'; // Tambahkan baris ini

function App() {
  // masterKey akan disimpan sementara di sini saat browser terbuka
  const [masterKey, setMasterKey] = useState('');

  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman pertama yang dibuka */}
        <Route path="/" element={<Gate setMasterKey={setMasterKey} />} />
        
        {/* Halaman brankas (sementara kita buat teks biasa dulu) */}
        <Route
       path="/vault"
       element={masterKey ? <Vault masterKey={masterKey} /> : <Navigate to="/" />}
     />
      </Routes>
    </BrowserRouter>
  );
}

export default App;