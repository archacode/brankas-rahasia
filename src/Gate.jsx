import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Typewriter from 'typewriter-effect';

export default function Gate({ setMasterKey }) {
  const [inputKey, setInputKey] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // KEAMANAN BARU: Hapus memori kunci setiap kali halaman ini terbuka!
    setMasterKey(''); 
    
    const timer = setTimeout(() => {
      setIsTypingComplete(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [setMasterKey]);

  const handleMasuk = (e) => {
    e.preventDefault();
    const SANDI_BENAR = 'kontol'; // <-- Jangan lupa ganti sandimu di sini lagi
    
    if (inputKey === SANDI_BENAR) {
      setShowError(false);
      setMasterKey(inputKey); 
      navigate('/vault');     
    } else {
      setShowError(true);
      setInputKey('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#050505', color: '#d4d4d4', fontFamily: '"Fira Code", Consolas, monospace', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '550px', backgroundColor: '#0f111a', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', border: '1px solid #1f2233', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '8px', padding: '15px 20px', backgroundColor: '#0f111a' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }}></div>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }}></div>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }}></div>
        </div>
        <div style={{ padding: '0 25px 30px 25px', fontSize: '15px', lineHeight: '2' }}>
          <Typewriter
            onInit={(typewriter) => {
              typewriter
                .changeDelay(20)
                .typeString('<span style="color: #569cd6">const</span> <span style="color: #f07178">vaultAccess</span> <span style="color: #d4d4d4">= {</span><br/>')
                .pauseFor(200).typeString('&nbsp;&nbsp;<span style="color: #d4d4d4">target:</span> <span style="color: #4caf50">"Personal_Vault"</span><span style="color: #d4d4d4">,</span><br/>')
                .pauseFor(200).typeString('&nbsp;&nbsp;<span style="color: #d4d4d4">status:</span> <span style="color: #4caf50">"Locked"</span><span style="color: #d4d4d4">,</span><br/>')
                .pauseFor(200).typeString('&nbsp;&nbsp;<span style="color: #d4d4d4">action:</span> <span style="color: #4caf50">"Require_Key"</span><br/><span style="color: #d4d4d4">};</span><br/><br/>')
                .start();
            }}
            options={{ cursor: '█', cursorClassName: 'custom-cursor' }}
          />
          <div style={{ opacity: isTypingComplete ? 1 : 0, transition: 'opacity 0.6s ease-in', pointerEvents: isTypingComplete ? 'auto' : 'none', marginTop: '10px' }}>
            {showError && (
              <div style={{ marginBottom: '20px', padding: '12px 15px', borderLeft: '4px solid #ff5f56', backgroundColor: '#1a0505', color: '#ff5f56', fontSize: '13px', fontWeight: 'bold', borderRadius: '0 6px 6px 0' }}>
                [!] FATAL_ERROR: ACCESS DENIED<br/>
                <span style={{ color: '#8b949e', fontWeight: 'normal', fontSize: '12px' }}>&gt; Unrecognized decryption key.</span>
              </div>
            )}
            <form onSubmit={handleMasuk} style={{ display: 'flex', gap: '10px' }}>
              <input type="password" value={inputKey} onChange={(e) => setInputKey(e.target.value)} placeholder='"Ketik_Kunci_Di_Sini"' style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid #1f2233', outline: 'none', fontSize: '14px', flex: 1, backgroundColor: '#1a1d2d', color: '#4caf50', fontFamily: 'inherit' }} />
              <button type="submit" style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#569cd6', color: '#fff', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'inherit' }}>Connect()</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}