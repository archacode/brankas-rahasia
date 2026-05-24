import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import CryptoJS from 'crypto-js';

export default function Vault({ masterKey }) {
  // --- STATE UTAMA ---
  const [accounts, setAccounts] = useState([]);
  const [subAccounts, setSubAccounts] = useState([]); 
  
  // State untuk form & interaksi UI Utama
  const [formData, setFormData] = useState({ name: '', desc: '', password: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  // State untuk fitur Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  // State Form Sub-Menu
  const [showSubVaultModal, setShowSubVaultModal] = useState(false);
  const [showSubAddForm, setShowSubAddForm] = useState(false);
  const [subFormData, setSubFormData] = useState({ label: '', value: '' });

  useEffect(() => {
    fetchAccounts();
  }, []);

  // --- FUNGSI FETCH ---
  const fetchAccounts = async () => {
    const { data, error } = await supabase.from('accounts').select('*').order('created_at', { ascending: false });
    if (!error && data) setAccounts(data);
  };

  const fetchSubAccounts = async (parentId) => {
    const { data, error } = await supabase
      .from('sub_accounts')
      .select('*')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });
    if (!error && data) setSubAccounts(data);
  };

  // --- FUNGSI CRUD AKUN UTAMA ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!masterKey) return alert('SYSTEM ERROR: Kunci hilang. Silakan masuk lagi.');
    if (!formData.name || !formData.password) return alert('Error: Nama dan Password wajib diisi.');

    setIsUploading(true);
    let finalLogoUrl = selectedAccount?.logo_url || '';

    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, selectedFile);

      if (uploadError) {
        alert('Gagal mengunggah foto: ' + uploadError.message);
        setIsUploading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
      finalLogoUrl = publicUrl;
    }

    const encrypted = CryptoJS.AES.encrypt(formData.password, masterKey).toString();
    
    let error;
    if (editingId) {
      const { error: updateError } = await supabase.from('accounts').update({
        account_name: formData.name,
        description: formData.desc,
        logo_url: finalLogoUrl,
        encrypted_password: encrypted
      }).eq('id', editingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('accounts').insert([{
        account_name: formData.name,
        description: formData.desc,
        logo_url: finalLogoUrl,
        encrypted_password: encrypted
      }]);
      error = insertError;
    }

    setIsUploading(false);

    if (!error) {
      closeFormModal();
      fetchAccounts();
    } else {
      alert('System Failure: Gagal menyimpan data.');
    }
  };

  const handleDeleteAccount = async (id) => {
    const isConfirm = window.confirm("WARNING: Data beserta semua Sub-Vault di dalamnya akan dihapus permanen. Lanjutkan?");
    if (!isConfirm) return;

    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (!error) {
      setSelectedAccount(null);
      fetchAccounts();
    } else {
      alert("Gagal menghapus data.");
    }
  };

  const handleOpenEdit = (acc) => {
    setEditingId(acc.id);
    setFormData({
      name: acc.account_name,
      desc: acc.description,
      password: decryptPassword(acc.encrypted_password)
    });
    setSelectedAccount(null); 
    setShowAddModal(true);    
  };

  const closeFormModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setFormData({ name: '', desc: '', password: '' });
    setSelectedFile(null);
  };

  // --- FUNGSI CRUD SUB-VAULT ---
  const handleAddSubAccount = async (e) => {
    e.preventDefault();
    if (!subFormData.label || !subFormData.value) return alert("Lengkapi data!");

    const encrypted = CryptoJS.AES.encrypt(subFormData.value, masterKey).toString();
    const { error } = await supabase.from('sub_accounts').insert([{
      parent_id: selectedAccount.id,
      label: subFormData.label,
      encrypted_value: encrypted
    }]);

    if (!error) {
      setSubFormData({ label: '', value: '' });
      setShowSubAddForm(false);
      fetchSubAccounts(selectedAccount.id);
    } else {
      alert("Gagal menyimpan sub-data.");
    }
  };

  const deleteSubAccount = async (id) => {
    if(!window.confirm("Hapus sub-data ini?")) return;
    const { error } = await supabase.from('sub_accounts').delete().eq('id', id);
    if (!error) fetchSubAccounts(selectedAccount.id);
  };

  const handleExploreSubVault = () => {
    fetchSubAccounts(selectedAccount.id);
    setShowSubVaultModal(true);
  };

  // --- UTILS ---
  const decryptPassword = (encryptedData) => {
    if (!masterKey) return 'SYSTEM_LOCKED';
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, masterKey);
      return bytes.toString(CryptoJS.enc.Utf8) || 'ACCESS DENIED';
    } catch (err) {
      return 'ACCESS DENIED';
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert(`[✓] Copied to clipboard.`);
  };

  // Logika Pencarian
  const filteredAccounts = accounts.filter(acc => 
    acc.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayedAccounts = filteredAccounts.slice(0, visibleCount);

  const MacHeader = () => (
    <div style={{ display: 'flex', gap: '8px', padding: '12px 15px', borderBottom: '1px solid #30363d', background: '#0d1117' }}>
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }}></div>
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }}></div>
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }}></div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#010409', color: '#c9d1d9', fontFamily: 'monospace', padding: '20px 15px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        
        {/* 1. HEADER UTAMA */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ color: '#8b949e', marginBottom: '10px', fontSize: '12px' }}>
            // system initialized. rendering components...
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0d1117', border: '1px solid #30363d', padding: '10px 20px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ color: '#ff7b72', fontSize: '18px', fontWeight: 'bold' }}>const</span>
            <span style={{ color: '#79c0ff', fontSize: '18px', fontWeight: 'bold', margin: '0 8px' }}>Vault</span>
            <span style={{ color: '#c9d1d9', fontSize: '18px', fontWeight: 'bold' }}>=</span>
            <span style={{ color: '#a5d6ff', fontSize: '18px', margin: '0 8px' }}>"</span>
            <span style={{ color: '#a5d6ff', fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>MY_SECRET</span>
            <span style={{ color: '#a5d6ff', fontSize: '18px' }}>"</span>
            <span style={{ color: '#c9d1d9', fontSize: '18px' }}>;</span>
          </div>
        </div>

        {/* 2. KONTROL (SEARCH & ADD) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
             <div style={{ color: '#8b949e', fontSize: '12px', marginBottom: '5px' }}>// target_array</div>
             <h2 style={{ margin: 0, fontWeight: 'bold', fontSize: '18px', color: '#d2a8ff' }}>accounts<span style={{color: '#c9d1d9'}}>[]</span></h2>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '6px 12px', flex: 1 }}>
              <span style={{ color: '#a5d6ff', marginRight: '5px' }}>"</span>
              <input 
                type="text" 
                placeholder="search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#a5d6ff', outline: 'none', width: '100%', minWidth: '80px', fontSize: '13px', fontFamily: 'monospace' }}
              />
              <span style={{ color: '#a5d6ff', marginLeft: '5px' }}>"</span>
            </div>
            <button 
              onClick={() => { setEditingId(null); setShowAddModal(true); }}
              style={{ padding: '7px 15px', borderRadius: '6px', background: '#238636', color: '#fff', fontSize: '14px', border: '1px solid rgba(240,246,252,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: 'bold', fontFamily: 'monospace', flexShrink: 0 }}
            >
              add()
            </button>
          </div>
        </div>

        {/* 3. DAFTAR AKUN */}
        <div style={{ background: '#0d1117', borderRadius: '10px', overflow: 'hidden', border: '1px solid #30363d', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          <MacHeader />
          <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayedAccounts.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#8b949e', fontStyle: 'italic', margin: '20px 0' }}>// array is empty or undefined</p>
            ) : (
              displayedAccounts.map((acc) => (
                <div key={acc.id} onClick={() => setSelectedAccount(acc)} style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', background: '#161b22', padding: '10px', borderRadius: '6px', border: '1px solid transparent', transition: 'border 0.2s' }} onMouseEnter={e => e.currentTarget.style.border = '1px solid #30363d'} onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}>
                  {acc.logo_url ? <img src={acc.logo_url} alt="logo" style={avatarStyle} /> : <div style={avatarFallbackStyle}>?</div>}
                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#e6edf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.account_name}</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#8b949e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. TOMBOL LOAD MORE */}
        {filteredAccounts.length > visibleCount && (
          <div style={{ textAlign: 'center', marginTop: '15px' }}>
            <div 
              onClick={() => setVisibleCount(prev => prev + 3)}
              style={{ cursor: 'pointer', fontSize: '13px', color: '#58a6ff', display: 'inline-block' }}
            >
              load_more();
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: FORM TAMBAH / EDIT AKUN                               */}
      {/* ============================================================== */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div style={{...modalStyle, maxWidth: '500px'}}>
            <MacHeader />
            <button onClick={closeFormModal} style={closeBtnStyle}>x</button>
            <form onSubmit={handleSaveAccount} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px' }}>
              <div style={{ margin: 0, fontSize: '14px' }}>
                <span style={{ color: '#ff7b72' }}>function</span> <span style={{ color: '#d2a8ff' }}>{editingId ? 'updateData' : 'createNewData'}</span><span style={{color: '#c9d1d9'}}>() {'{'}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#8b949e' }}>// upload_image_object</span>
                  <label style={uploadBoxStyle}>
                      {selectedFile ? `[✓] ${selectedFile.name}` : '+ selectFile(logo)'}
                      <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
                 <span style={{ fontSize: '11px', color: '#8b949e' }}>// account_target_name</span>
                 <input placeholder="ex: Akun Utama / Nama Target" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputCodeStyle} required/>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
                 <span style={{ fontSize: '11px', color: '#8b949e' }}>// detail_description</span>
                 <textarea placeholder="ex: Akun untuk keperluan..." value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} style={{...inputCodeStyle, minHeight: '50px', resize: 'vertical'}} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '10px' }}>
                 <span style={{ fontSize: '11px', color: '#8b949e' }}>// secret_password</span>
                 <input type="password" placeholder="********" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={inputCodeStyle} required/>
              </div>
              
              <div style={{ fontSize: '14px' }}>{'}'}</div>

              <button type="submit" style={{...btnStyle, opacity: isUploading ? 0.5 : 1}} disabled={isUploading}>
                {isUploading ? 'Executing()...' : 'Execute()'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: DETAIL AKUN UTAMA                                     */}
      {/* ============================================================== */}
      {selectedAccount && !showSubVaultModal && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <MacHeader />
            <button onClick={() => setSelectedAccount(null)} style={closeBtnStyle}>x</button>
            
            <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '13px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {selectedAccount.logo_url ? <img src={selectedAccount.logo_url} alt="logo" style={bigAvatarStyle} /> : <div style={bigAvatarFallbackStyle}>?</div>}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                   <span style={{ color: '#8b949e', fontSize: '11px' }}>// target_selected</span>
                   <h3 style={{ margin: 0, color: '#e6edf3', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedAccount.account_name}</h3>
                </div>
              </div>
              
              <div style={{ color: '#c9d1d9', lineHeight: '1.6', overflowX: 'auto', background: '#161b22', padding: '10px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <span style={{ color: '#ff7b72' }}>const</span> <span style={{ color: '#79c0ff' }}>vaultAccess</span> = {'{'}
                
                <div style={{ paddingLeft: '15px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#c9d1d9' }}>target:</span> 
                    <span style={{ color: '#a5d6ff', wordBreak: 'break-all' }}>"{selectedAccount.account_name}"</span>,
                    <button onClick={() => handleCopy(selectedAccount.account_name)} style={copyBtnStyle}>copy()</button>
                  </div>
                  <div>
                    <span style={{ color: '#c9d1d9' }}>status:</span> <span style={{ color: '#a5d6ff' }}>"Locked"</span>,
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#c9d1d9' }}>description:</span> 
                    <span style={{ color: '#a5d6ff', whiteSpace: 'pre-wrap', wordBreak: 'break-word', paddingLeft: '10px' }}>"{selectedAccount.description}"</span>
                  </div>
                </div>
                
                {'}'};
              </div>

              <div style={{ marginTop: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px', background: '#161b22', border: '1px solid #30363d', borderRadius: '6px', padding: '10px', color: '#a5d6ff', display: 'flex', alignItems: 'center', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  "{decryptPassword(selectedAccount.encrypted_password)}"
                </div>
                <button onClick={() => handleCopy(decryptPassword(selectedAccount.encrypted_password))} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 15px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', flexShrink: 0 }}>
                  Connect()
                </button>
              </div>

              {/* ACTION BUTTONS: EDIT, DELETE, EXPLORE */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '8px', borderTop: '1px dashed #30363d', paddingTop: '15px', flexWrap: 'wrap' }}>
                <button onClick={() => handleOpenEdit(selectedAccount)} style={{ flex: 1, minWidth: '80px', background: 'transparent', color: '#d2a8ff', border: '1px solid #d2a8ff', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace' }}>
                  edit()
                </button>
                <button onClick={() => handleDeleteAccount(selectedAccount.id)} style={{ flex: 1, minWidth: '80px', background: 'transparent', color: '#ff7b72', border: '1px solid #ff7b72', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace' }}>
                  delete()
                </button>
              </div>
              
              <div style={{ marginTop: '10px' }}>
                <button onClick={handleExploreSubVault} style={{ width: '100%', background: '#238636', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  explore_linked_data() // Masuk sub-menu
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: SUB-MENU (DATA TAMBAHAN SEPERTI BANK, GOPAY DLL)      */}
      {/* ============================================================== */}
      {showSubVaultModal && selectedAccount && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <MacHeader />
            <button onClick={() => {setShowSubVaultModal(false); setShowSubAddForm(false);}} style={closeBtnStyle}>back()</button>
            
            <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '13px' }}>
              <div style={{ color: '#8b949e', marginBottom: '10px', wordBreak: 'break-all' }}>
                // linked_data_array for: <span style={{color: '#a5d6ff'}}>"{selectedAccount.account_name}"</span>
              </div>
              <h3 style={{ margin: '0 0 15px 0', color: '#79c0ff', fontSize: '16px' }}>Sub-Vault Storage</h3>
              
              {/* List Data Anak */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', maxHeight: '40vh', overflowY: 'auto', paddingRight: '5px' }}>
                {subAccounts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 15px', border: '1px dashed #30363d', borderRadius: '6px', background: '#161b22' }}>
                     <p style={{ color: '#8b949e', marginTop: 0, fontSize: '11px' }}>
                        /* Ruang untuk Sub-Akun, Website, atau Kunci Spesifik lainnya */
                     </p>
                     <div style={{ color: '#d2a8ff', fontSize: '18px', margin: '10px 0' }}>[ EMP_TY ]</div>
                  </div>
                ) : (
                  subAccounts.map(sub => (
                    <div key={sub.id} style={{ background: '#161b22', padding: '12px', borderRadius: '6px', border: '1px solid #30363d' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b949e', fontSize: '11px', marginBottom: '8px' }}>
                        <span style={{ wordBreak: 'break-all', paddingRight: '10px' }}>// {sub.label}</span>
                        <span onClick={() => deleteSubAccount(sub.id)} style={{ color: '#ff7b72', cursor: 'pointer', borderBottom: '1px dashed #ff7b72', flexShrink: 0 }}>delete()</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ color: '#60ffb9', fontWeight: 'bold', letterSpacing: '1px', wordBreak: 'break-all' }}>
                          {decryptPassword(sub.encrypted_value)}
                        </span>
                        <button onClick={() => handleCopy(decryptPassword(sub.encrypted_value))} style={copyBtnStyle}>copy()</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Form Tambah Data Anak */}
              {showSubAddForm ? (
                <form onSubmit={handleAddSubAccount} style={{ background: '#0d1117', padding: '15px', borderRadius: '6px', border: '1px solid #58a6ff' }}>
                  <div style={{ color: '#58a6ff', marginBottom: '10px', fontSize: '12px' }}>&gt;_ new_child_entry</div>
                  {/* Teks placeholder disesuaikan menjadi "Username/Akun" dan "Password/Kunci" */}
                  <input placeholder="const account = 'Username / Nama Akun';" value={subFormData.label} onChange={e => setSubFormData({...subFormData, label: e.target.value})} style={inputCodeStyle} required />
                  <input placeholder="const key = 'Password / Kunci Rahasia';" value={subFormData.value} onChange={e => setSubFormData({...subFormData, value: e.target.value})} style={{...inputCodeStyle, marginTop: '10px'}} required />
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '15px', flexWrap: 'wrap' }}>
                    <button type="submit" style={{ flex: 1, minWidth: '100px', background: '#238636', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>save()</button>
                    <button type="button" onClick={() => setShowSubAddForm(false)} style={{ flex: 1, minWidth: '100px', background: 'transparent', color: '#ff7b72', border: '1px solid #ff7b72', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace' }}>cancel()</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowSubAddForm(true)} style={{ width: '100%', background: 'transparent', color: '#58a6ff', border: '1px dashed #58a6ff', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace' }}>
                   + insert_new_child_data()
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- GAYA CSS ---
const avatarStyle = { width: '35px', height: '35px', borderRadius: '50%', border: '1px solid #30363d', objectFit: 'cover', flexShrink: 0, background: '#161b22' };
const avatarFallbackStyle = { width: '35px', height: '35px', background: '#21262d', border: '1px solid #30363d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8b949e', fontWeight: 'bold' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(1,4,9,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px', boxSizing: 'border-box', backdropFilter: 'blur(3px)' };
const modalStyle = { background: '#0d1117', border: '1px solid #30363d', borderRadius: '10px', width: '100%', maxWidth: '450px', position: 'relative', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', overflow: 'hidden', maxHeight: '95vh', display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { position: 'absolute', top: '10px', right: '15px', background: 'transparent', border: 'none', color: '#ff7b72', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace' };

const inputCodeStyle = { padding: '10px 12px', background: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '6px', fontFamily: 'monospace', outline: 'none', width: '100%', boxSizing: 'border-box', fontSize: '12px' };
const uploadBoxStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#0d1117', border: '1px dashed #30363d', borderRadius: '6px', cursor: 'pointer', color: '#58a6ff', fontSize: '12px', fontFamily: 'monospace', textAlign: 'center' };
const btnStyle = { padding: '10px 15px', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', marginTop: '10px' };

const bigAvatarStyle = { width: '50px', height: '50px', borderRadius: '50%', border: '1px solid #30363d', objectFit: 'cover', background: '#161b22', flexShrink: 0 };
const bigAvatarFallbackStyle = { width: '50px', height: '50px', background: '#161b22', border: '1px solid #30363d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#8b949e', flexShrink: 0 };

const copyBtnStyle = { background: 'transparent', color: '#8b949e', border: '1px solid #30363d', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit' };