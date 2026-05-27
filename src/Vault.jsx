import React, { useState, useEffect } from 'react';
import sha256 from 'crypto-js/sha256';
import './Vault.css'; 
import { supabase } from './supabase'; 

function Vault({ onLock }) {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [isPribadiUnlocked, setIsPribadiUnlocked] = useState(false);
  const [showPribadiGate, setShowPribadiGate] = useState(false);
  const [pribadiPasswordInput, setPribadiPasswordInput] = useState('');
  const [pribadiError, setPribadiError] = useState('');

  const [isBankUnlocked, setIsBankUnlocked] = useState(false);
  const [showBankGate, setShowBankGate] = useState(false);
  const [bankPasswordInput, setBankPasswordInput] = useState('');
  const [bankError, setBankError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  
  const [formData, setFormData] = useState({
    id: null, site_name: '', description: '', username: '', password: '', 
    category: 'Bank', spam_group: '', image_url: '', cover_image_url: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  // --- 1. MENGAMBIL DATA DARI DATABASE ---
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('id', { ascending: false });

      if (error) console.error("Gagal narik data Supabase:", error);
      else setAccounts(data || []);
    } catch (err) {
      console.error("Koneksi Supabase error:", err);
    }
    setIsLoading(false);
  };

  // --- 2. SENSOR KEAMANAN (AUTO-LOCK PINDAH TAB & MUNDUR BROWSER) ---
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => { if (onLock) onLock(); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onLock]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setIsPribadiUnlocked(false);
        setIsBankUnlocked(false);
        if (activeCategory === 'Pribadi' || activeCategory === 'Bank') {
          setActiveCategory('Semua');
          setShowPribadiGate(false);
          setShowBankGate(false);
        }
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, [activeCategory]);

  const handleCategoryClick = (categoryName) => {
    if (categoryName !== 'Pribadi') setIsPribadiUnlocked(false);
    if (categoryName !== 'Bank') setIsBankUnlocked(false);

    if (categoryName === 'Pribadi') {
      if (!isPribadiUnlocked) setShowPribadiGate(true);
      else setActiveCategory(categoryName);
    } 
    else if (categoryName === 'Bank') {
      if (!isBankUnlocked) setShowBankGate(true);
      else setActiveCategory(categoryName);
    } 
    else {
      setActiveCategory(categoryName);
    }
  };

  const handleBankUnlockSubmit = (e) => {
    e.preventDefault();

    const hasilHash = sha256(bankPasswordInput).toString();

    // Proses pengecekan keamanan
    if (hasilHash === import.meta.env.VITE_BANK_PASSWORD) {
      setIsBankUnlocked(true);
      setShowBankGate(false);
      setBankError('');
      setActiveCategory('Bank');
      setBankPasswordInput(''); // Kosongkan input setelah berhasil
    } else {
      // JURUS BARBAR: Kita paksa hash-nya tampil di layar!
      setBankError('Hash sandi ini: ' + hasilHash);
      setBankPasswordInput(''); 
    }
  };

  const handlePribadiUnlockSubmit = (e) => {
    e.preventDefault();
    if (sha256(pribadiPasswordInput).toString() === import.meta.env.VITE_PRIBADI_PASSWORD) {
      setIsPribadiUnlocked(true);
      setShowPribadiGate(false);
      setPribadiError('');
      setActiveCategory('Pribadi');
      setPribadiPasswordInput('');
    } else {
      setPribadiError('Kunci Pribadi Salah, Bos!');
      setPribadiPasswordInput('');
    }
  };

  // --- 3. FILTERING & SEARCH ANTI-CRASH ---
  const filteredAccounts = accounts.filter((account) => {
    if (!account) return false;
    
    const cat = account.category || 'Bank'; 
    if (activeCategory === 'Semua' && (cat === 'Pribadi' || cat === 'Spam' || cat === 'Bank')) return false; 
    
    const matchesCategory = activeCategory === 'Semua' || cat === activeCategory;
    const siteName = String(account.site_name || '').toLowerCase();
    const username = String(account.username || '').toLowerCase();
    const query = String(searchQuery || '').toLowerCase();
    const matchesSearch = siteName.includes(query) || username.includes(query);
    
    return matchesCategory && matchesSearch;
  });

  const groupSpamAccounts = () => {
    const groups = {};
    filteredAccounts.forEach(account => {
      const groupName = String(account.spam_group || 'Tanpa Kelompok').trim();
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(account);
    });
    return groups;
  };

  const existingSpamGroups = Array.from(new Set(
    accounts.filter(acc => acc && acc.category === 'Spam' && acc.spam_group).map(acc => String(acc.spam_group).trim())
  ));

  const handleAddClick = () => {
    setFormData({ id: null, site_name: '', description: '', username: '', password: '', category: 'Bank', spam_group: '', image_url: '', cover_image_url: '' });
    setImageFile(null); setCoverFile(null); setIsEditing(false); setShowModal(true);
  };

  const handleEditClick = (account) => {
    setFormData({
      id: account.id,
      site_name: account.site_name || '',
      description: account.description || '',
      username: account.username || '',
      password: account.password || '',
      category: account.category || 'Bank',
      spam_group: account.spam_group || '',
      image_url: account.image_url || '',
      cover_image_url: account.cover_image_url || ''
    });
    setImageFile(null); setCoverFile(null); setIsEditing(true); setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin mau menghapus akun ini permanen, Bos?")) {
      try {
        await supabase.from('accounts').delete().eq('id', id);
        fetchAccounts();
      } catch (err) { alert("Gagal menghapus!"); }
    }
  };

  // --- 4. SIMPAN KE DATABASE (DENGAN ALARM ERROR) ---
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true); 

    let finalImageUrl = formData.image_url;
    let finalCoverUrl = formData.cover_image_url;

    const uploadFileToSupabase = async (file) => {
      try {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { error } = await supabase.storage.from('vault-images').upload(fileName, file);
        if (error) return null;
        const { data } = supabase.storage.from('vault-images').getPublicUrl(fileName);
        return data.publicUrl; 
      } catch (err) { return null; }
    };

    if (imageFile) {
      const url = await uploadFileToSupabase(imageFile);
      finalImageUrl = url || ''; 
    }
    if (coverFile) {
      const url = await uploadFileToSupabase(coverFile);
      finalCoverUrl = url || '';
    }

    const accountDataToSave = {
      site_name: formData.site_name || 'Tanpa Nama',
      description: formData.description || '',
      username: formData.username || '',
      password: formData.password || '',
      category: formData.category || 'Bank',
      spam_group: formData.spam_group || '',
      image_url: finalImageUrl || '',
      cover_image_url: finalCoverUrl || ''
    };

    try {
      let dbError = null;
      if (isEditing) {
        const { error } = await supabase.from('accounts').update(accountDataToSave).eq('id', formData.id);
        dbError = error;
      } else {
        const { error } = await supabase.from('accounts').insert([accountDataToSave]);
        dbError = error;
      }

      // ALARM JIKA SUPABASE MENOLAK DATA BARU
      if (dbError) {
        alert("Waduh, Supabase nolak Bos! Alasan: " + dbError.message);
        console.error("Detail Error:", dbError);
      }

    } catch (err) { 
      alert("Sistem Crash Bos: " + err.message);
      console.error(err); 
    }

    setIsSaving(false); setShowModal(false); setImageFile(null); setCoverFile(null); fetchAccounts(); 
  };

  const handleImageChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (field === 'image') setImageFile(file);
      if (field === 'cover_image') setCoverFile(file);
      const localUrl = URL.createObjectURL(file);
      setFormData({ ...formData, [field === 'image' ? 'image_url' : 'cover_image_url']: localUrl });
    }
  };

  const togglePassword = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text) => {
    if (!text) return alert("Kosong Bos, gak ada yang bisa dicopy!");
    navigator.clipboard.writeText(text);
    alert("Berhasil dicopy, Bos!"); 
  };

  const Icons = {
    Lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    LockSmall: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '14px', height: '14px', marginLeft: 'auto', opacity: 0.8}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    Folder: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '20px', height: '20px'}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
    All: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    Bank: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"></path><path d="M3 10h18"></path><path d="M5 6l7-3 7 3"></path><path d="M4 10v11"></path><path d="M20 10v11"></path><path d="M8 14v3"></path><path d="M12 14v3"></path><path d="M16 14v3"></path></svg>,
    Mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
    Phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>,
    Game: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12A10 10 0 0 0 2 12c0 4.2 2.6 7.7 6.3 9.1.5.2.9-.1 1.1-.5l.9-2.6h3.4l.9 2.6c.2.4.6.7 1.1.5 3.7-1.4 6.3-4.9 6.3-9.1z"></path></svg>,
    Web: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>,
    User: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
    Trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
    Eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
    EyeOff: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
  };

  const renderCard = (account) => (
    <div className="account-card" key={account.id}>
      {account.cover_image_url && (
        <div className="account-card-cover-wrapper">
          <img src={account.cover_image_url} alt="Cover" className="account-card-cover" />
          <div className="account-card-cover-overlay"></div>
        </div>
      )}
      <div className="account-card-content">
        <div className="card-header">
          <div className="card-icon">
            {account.image_url ? <img src={account.image_url} alt="Logo" /> : String(account.site_name || '?').substring(0, 1).toUpperCase()}
          </div>
          <div className="card-title-group">
            <h3 className="card-title">{account.site_name || 'Tanpa Nama'}</h3>
            <span className="card-category">{account.category || 'Bank'}</span>
          </div>
        </div>
        {account.description && <div className="card-desc">{account.description}</div>}
        <div className="card-body">
          <div className="info-group">
            <label className="info-label">Username / Email</label>
            <div className="info-value-area">
              <span className="info-value">{account.username}</span>
              <button className="action-icon-btn" onClick={() => handleCopy(account.username)} title="Copy Username">{Icons.Copy}</button>
            </div>
          </div>
          <div className="info-group">
            <label className="info-label">Password</label>
            <div className="info-value-area">
              <span className="info-value">{visiblePasswords[account.id] ? account.password : '••••••••••••'}</span>
              <button className="action-icon-btn" onClick={() => togglePassword(account.id)} title="Lihat Password">{visiblePasswords[account.id] ? Icons.EyeOff : Icons.Eye}</button>
              <button className="action-icon-btn" onClick={() => handleCopy(account.password)} title="Copy Password">{Icons.Copy}</button>
            </div>
          </div>
        </div>
        <div className="card-actions">
          <button className="btn-edit" onClick={() => handleEditClick(account)}>Edit</button>
          <button className="btn-delete" onClick={() => handleDelete(account.id)}>Hapus</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="vault-container">
      <aside className="vault-sidebar">
        <div className="brand-area" onClick={() => handleCategoryClick('Semua')} style={{cursor: 'pointer'}}>
          <span className="brand-icon">{Icons.Lock}</span> LOCKLOCK
        </div>
        <ul className="menu-list">
          <li className={`menu-item ${activeCategory === 'Semua' ? 'active' : ''}`} onClick={() => handleCategoryClick('Semua')}>{Icons.All} Semua Akun</li>
          <li className={`menu-item ${activeCategory === 'Bank' ? 'active' : ''}`} onClick={() => handleCategoryClick('Bank')} style={{display: 'flex'}}>{Icons.Bank} Perbankan {Icons.LockSmall}</li>
          <li className={`menu-item ${activeCategory === 'Gmail' ? 'active' : ''}`} onClick={() => handleCategoryClick('Gmail')}>{Icons.Mail} Gmail</li>
          <li className={`menu-item ${activeCategory === 'Medsos' ? 'active' : ''}`} onClick={() => handleCategoryClick('Medsos')}>{Icons.Phone} Sosial Media</li>
          <li className={`menu-item ${activeCategory === 'Game' ? 'active' : ''}`} onClick={() => handleCategoryClick('Game')}>{Icons.Game} Game</li>
          <li className={`menu-item ${activeCategory === 'Web' ? 'active' : ''}`} onClick={() => handleCategoryClick('Web')}>{Icons.Web} Website</li>
          <li className={`menu-item ${activeCategory === 'Spam' ? 'active' : ''}`} onClick={() => handleCategoryClick('Spam')}>{Icons.Trash} Spam</li>
          <li className={`menu-item ${activeCategory === 'Pribadi' ? 'active' : ''}`} onClick={() => handleCategoryClick('Pribadi')} style={{display: 'flex'}}>{Icons.User} Pribadi {Icons.LockSmall}</li>
        </ul>
        <div className="sidebar-footer">&copy; 2026 Archacode&trade;</div>
      </aside>

      <main className="vault-main">
        <header className="vault-header">
          <div className="header-left"><h1>{activeCategory === 'Semua' ? 'Beranda / Semua Akun' : `Kategori: ${activeCategory}`}</h1></div>
          <div className="header-right">
            <input type="text" placeholder="Cari akun..." className="search-bar" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <button className="btn-add" onClick={handleAddClick}>+ Tambah Data</button>
          </div>
        </header>

        <div className="vault-content">
          {isLoading ? (
            <div className="empty-state"><h3 style={{color: '#58a6ff'}}>🔄 Mengambil Data dari Brankas...</h3></div>
          ) : filteredAccounts.length > 0 ? (
            activeCategory === 'Spam' ? (
              Object.entries(groupSpamAccounts()).map(([groupName, accountsInGroup]) => (
                <div className="spam-group-section" key={groupName}>
                  <h2 className="spam-group-heading">{Icons.Folder} Kelompok: {groupName}</h2>
                  <div className="cards-grid">{accountsInGroup.map(acc => renderCard(acc))}</div>
                </div>
              ))
            ) : (
              <div className="cards-grid">{filteredAccounts.map(acc => renderCard(acc))}</div>
            )
          ) : (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><path d="M11 8v2"></path><path d="M11 14h.01"></path></svg>
              <h3>Waduh, Kosong Nih!</h3><p>Data yang Bos cari belum dibuat atau nggak ketemu.</p>
            </div>
          )}
        </div>
      </main>

      {/* GERBANG BANK */}
      {showBankGate && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center', padding: '40px 30px', width: '360px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2" style={{ width: '50px', height: '50px', marginBottom: '15px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h2>Brankas Perbankan</h2>
            <form onSubmit={handleBankUnlockSubmit}>
              <div className="form-group"><input type="password" required placeholder="Masukkan PIN Bank..." value={bankPasswordInput} onChange={(e) => setBankPasswordInput(e.target.value)} style={{ textAlign: 'center', letterSpacing: '4px' }} /></div>
              
              {/* Tempat Error Ditampilkan */}
              <div style={{ color: '#f85149', fontSize: '0.85rem', marginBottom: '15px', minHeight: '18px', wordBreak: 'break-all' }}>
                {bankError}
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowBankGate(false)}>Batal</button>
                <button type="submit" className="btn-save" style={{ backgroundColor: '#1f6feb' }}>Buka Brankas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GERBANG PRIBADI */}
      {showPribadiGate && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ textAlign: 'center', padding: '40px 30px', width: '360px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#f85149" strokeWidth="2" style={{ width: '50px', height: '50px', marginBottom: '15px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h2>Area Pribadi Terkunci</h2>
            <form onSubmit={handlePribadiUnlockSubmit}>
              <div className="form-group"><input type="password" required placeholder="Masukkan Kunci..." value={pribadiPasswordInput} onChange={(e) => setPribadiPasswordInput(e.target.value)} style={{ textAlign: 'center', letterSpacing: '4px' }} /></div>
              <div style={{ color: '#f85149', fontSize: '0.85rem', marginBottom: '15px', minHeight: '18px' }}>{pribadiError}</div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowPribadiGate(false)}>Batal</button>
                <button type="submit" className="btn-save" style={{ backgroundColor: '#f85149' }}>Buka Kunci</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM TAMBAH/EDIT */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2>{isEditing ? 'Edit Data Akun' : 'Tambah Akun Baru'}</h2>
            <form onSubmit={handleFormSubmit}>
              <div className="form-group"><label>Nama Akun / Web</label><input type="text" required placeholder="cth: BCA Digital" value={formData.site_name} onChange={(e) => setFormData({...formData, site_name: e.target.value})} /></div>
              <div className="form-group"><label>Deskripsi</label><textarea placeholder="cth: Catatan..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
              <div className="form-group">
                <label>Kategori</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option value="Bank">Perbankan</option><option value="Gmail">Gmail</option><option value="Medsos">Sosial Media</option>
                  <option value="Game">Game</option><option value="Web">Website</option><option value="Spam">Spam</option><option value="Pribadi">Pribadi</option>
                </select>
              </div>

              {formData.category === 'Spam' && (
                <div className="form-group" style={{ borderLeft: '2px solid #58a6ff', paddingLeft: '10px' }}>
                  <label style={{ color: '#58a6ff' }}>Nama Kelompok Spam</label>
                  <input type="text" required placeholder="Pilih atau ketik kelompok baru..." value={formData.spam_group} onChange={(e) => setFormData({...formData, spam_group: e.target.value})} list="spam-groups-options" />
                  <datalist id="spam-groups-options">{existingSpamGroups.map((group, index) => (<option key={index} value={group} />))}</datalist>
                </div>
              )}

              <div className="form-group"><label>Username / Email</label><input type="text" required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} /></div>
              <div className="form-group"><label>Password</label><input type="text" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} /></div>
              <div className="form-group"><label>Logo / Gambar Profil</label><input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'image')} /></div>
              <div className="form-group"><label>Sampul Kartu</label><input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'cover_image')} /></div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)} disabled={isSaving}>Batal</button>
                <button type="submit" className="btn-save" disabled={isSaving}>{isSaving ? 'Menyimpan...' : 'Simpan Data'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vault; 