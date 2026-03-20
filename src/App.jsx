import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient'; 
import backgroundVideo from './assets/background.mp4'; 
import aboutContent from './assets/ABOUT_CONTENT.png'; 

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [heritageSites, setHeritageSites] = useState([]); 
  const [selectedSite, setSelectedSite] = useState(null); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSite, setNewSite] = useState({ 
    Name: '', image_url: '', history: '', date_made: '', risk_level: 'Low', latitude: '', longitude: '', points: 0 
  });
  
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({ desc: '', img: '' });
  const [reportQueue, setReportQueue] = useState([]);
  const [activeReport, setActiveReport] = useState(null); 
  const [evaluationData, setEvaluationData] = useState({ type: 'Crack', level: 'Low' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);

  // --- NEW STATES ---
  const [isNaturalFormation, setIsNaturalFormation] = useState(false);

  const handleFileUpload = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'site') setNewSite({ ...newSite, image_url: reader.result });
        if (target === 'report') setReportData({ ...reportData, img: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CORE FUNCTIONS ---
  const fetchSites = useCallback(async () => {
    const { data, error } = await supabase.from('heritage_sites').select('*');
    if (!error) setHeritageSites(data);
    else console.error("Error fetching sites:", error);
  }, []);

  const fetchReportQueue = useCallback(async () => {
    const { data, error } = await supabase.from('heritage_reports').select('*, heritage_sites(Name)');
    if (!error) setReportQueue(data);
    else console.error("Error fetching reports:", error);
  }, []);

  useEffect(() => { 
    fetchSites(); 
    fetchReportQueue();
  }, [fetchSites, fetchReportQueue]);

  const riskWeights = {
    'Crack': { 'Low': 1.0, 'Moderate': 1.2, 'High': 1.5 },
    'Weathering': { 'Low': 0.7, 'Moderate': 1.0, 'High': 1.3 },
    'Vandalism': { 'Low': 0.5, 'Moderate': 1.0, 'High': 1.5 },
    'Erosion': { 'Low': 0.8, 'Moderate': 1.1, 'High': 1.4 },
    'Pollution': { 'Low': 0.6, 'Moderate': 0.9, 'High': 1.2 }
  };

  const handleLogin = () => {
    if (loginData.user.trim() === 'admin' && loginData.pass.trim() === '1234') {
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setShowLoginSuccess(true);
    } else { alert("Invalid Credentials"); }
  };

  async function handleDeleteSite(id, e) {
    e.stopPropagation(); 
    if (window.confirm("Are you sure you want to delete this site?")) {
      const { error } = await supabase.from('heritage_sites').delete().eq('id', id);
      if (!error) fetchSites();
    }
  }

  async function handleSubmitReport() {
    if (!reportData.desc || !reportData.img) return alert("Please provide a description and either a URL or a File.");
    
    setIsSubmitting(true);
    const { error } = await supabase.from('heritage_reports').insert([
      { site_id: selectedSite.id, description: reportData.desc, image_url: reportData.img }
    ]);
    setIsSubmitting(false);
    if (!error) { 
        setShowReportForm(false); 
        setShowSuccessModal(true); 
        fetchReportQueue(); 
        setReportData({ desc: '', img: '' });
    }
  }

  async function handleCompleteEvaluation() {
    if (!activeReport) return;
    const currentSite = heritageSites.find(s => s.id === activeReport.site_id);
    const addedPoints = riskWeights[evaluationData.type][evaluationData.level];
    const newTotalPoints = (currentSite.points || 0) + addedPoints;
    
    let finalRiskCategory = 'Low';
    if (newTotalPoints > 8.0) finalRiskCategory = 'High';
    else if (newTotalPoints > 4.0) finalRiskCategory = 'Moderate';

    await supabase.from('heritage_sites').update({ 
      risk_level: finalRiskCategory,
      points: newTotalPoints 
    }).eq('id', activeReport.site_id);

    await supabase.from('heritage_reports').delete().eq('id', activeReport.id);
    
    setShowSuccessModal(true);
    setActiveReport(null);
    fetchReportQueue();
    fetchSites();
    if (selectedSite) setSelectedSite({...currentSite, risk_level: finalRiskCategory, points: newTotalPoints});
  }

  async function handleAddSite() {
    const { Name, image_url, history, date_made, latitude, longitude, risk_level, points } = newSite;
    const finalDateValue = isNaturalFormation ? "Natural Formation" : date_made;

    if (!Name || !image_url || !history || !finalDateValue || !latitude || !longitude) {
      return alert("Admin, please fill up all fields. Ensure either a Photo is uploaded/linked and a Date is chosen/checked.");
    }

    const { error } = await supabase.from('heritage_sites').insert([
      { Name, image_url, history, date_made: finalDateValue, latitude, longitude, risk_level, points }
    ]);

    if (!error) { 
      setShowAddModal(false); 
      fetchSites(); 
      setNewSite({ Name: '', image_url: '', history: '', date_made: '', risk_level: 'Low', latitude: '', longitude: '', points: 0 });
      setIsNaturalFormation(false);
      setShowSuccessModal(true);
    } else {
      alert("Error: " + error.message);
    }
  }

  const handleLocateMe = (site) => {
    if (!site.latitude || !site.longitude) return alert("Coordinates missing!");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${site.latitude},${site.longitude}&travelmode=driving`;
          window.open(mapUrl, '_blank');
        },
        () => {
          window.open(`https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`, '_blank');
        }
      );
    }
  };

  // --- STYLING ---
  const navBtn = { backgroundColor: 'rgba(10, 45, 30, 0.7)', border: '1px solid #8fc444', padding: '6px 22px', borderRadius: '25px', color: 'white', cursor: 'pointer', transition: 'all 0.3s ease' };
  const actionBtnStyle = (color) => ({ width: '100%', padding: '15px 25px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', transition: 'transform 0.2s ease' });
  const modalOverlay = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300 };
  const adminInput = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #8fc444', background: '#0a1a0a', color: 'white' };
  const fileUploadBtn = { display: 'block', width: '100%', padding: '10px', background: '#2d4d2d', color: 'white', borderRadius: '5px', marginBottom: '10px', cursor: 'pointer', border: '1px dashed #8fc444', fontSize: '14px', textAlign: 'center' };
  const previewBox = { width: '100%', height: '120px', borderRadius: '10px', border: '1px solid #8fc444', marginBottom: '10px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' };

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', color: 'white', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spinner { border: 4px solid rgba(143, 196, 68, 0.3); border-top: 4px solid #8fc444; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
        .site-card:hover { transform: scale(1.03); background-color: rgba(40, 70, 40, 0.9) !important; }
        .btn-hover:hover { transform: translateY(-2px); filter: brightness(1.2); }
        .custom-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <video src={backgroundVideo} autoPlay loop muted playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', zIndex: -2 }} />
      <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: -1 }} />

      <nav style={{display: 'flex', justifyContent: 'flex-end', padding: '20px 60px', gap: '15px', zIndex: 10, position: 'relative'}}>
        <button className="btn-hover" style={navBtn} onClick={() => { setCurrentScreen('home'); setSelectedSite(null); }}>Home</button>
        <button className="btn-hover" style={navBtn} onClick={() => setCurrentScreen('about')}>About Us</button>
        {isLoggedIn && <button className="btn-hover" style={{...navBtn, backgroundColor: '#8fc444'}} onClick={() => setShowAddModal(true)}>+ Add Site</button>}
        {isLoggedIn && <button className="btn-hover" style={{...navBtn, backgroundColor: '#d9534f'}} onClick={() => setCurrentScreen('report-queue')}>Queue 📋</button>}
        <button className="btn-hover" style={navBtn} onClick={() => isLoggedIn ? setIsLoggedIn(false) : setShowLoginModal(true)}>{isLoggedIn ? "Log-out" : "Log-in"}</button>
      </nav>

      {currentScreen === 'about' && (
        <main style={{ height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'popIn 0.6s ease' }}>
          <img src={aboutContent} alt="About Us" style={{ maxWidth: '80%', maxHeight: '80%', borderRadius: '20px', border: '2px solid #8fc444' }} />
        </main>
      )}

      {currentScreen === 'home' && (
        <main style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '10%', height: '80vh', animation: 'slideUp 0.8s ease'}}>
          <div style={{fontSize: '40px'}}>Kabilin sa</div>
          <h1 style={{fontSize: '120px', fontWeight: '800', margin: 0}}>CLARIN</h1>
          <button className="btn-hover" onClick={() => setCurrentScreen('learn-more')} style={{ position: 'absolute', bottom: '60px', right: '80px', padding: '12px 60px', fontSize: '24px', background: '#8fc444', borderRadius: '4px', cursor: 'pointer', border: 'none', color: '#1a2e1a', fontWeight: 'bold' }}>Learn More</button>
        </main>
      )}

      {currentScreen === 'learn-more' && !selectedSite && (
        <main style={{ padding: '0 10%', height: '85vh', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.5s ease' }}>
          <h1 style={{ fontSize: '60px', marginBottom: '20px' }}>Heritage Sites</h1>
          <div className="custom-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px', overflowY: 'auto', flex: 1, paddingBottom: '50px' }}>
            {heritageSites.map((site) => (
              <div key={site.id} className="site-card" onClick={() => setSelectedSite(site)} style={{ backgroundColor: 'rgba(26, 46, 26, 0.9)', padding: '30px', borderRadius: '20px', cursor: 'pointer', position: 'relative' }}>
                {isLoggedIn && (
                  <button onClick={(e) => handleDeleteSite(site.id, e)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#d9534f', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>X</button>
                )}
                <h2 style={{ margin: '0' }}>{site.Name}</h2>
                <img src={site.image_url} alt={site.Name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '15px', marginTop: '10px' }} />
              </div>
            ))}
          </div>
        </main>
      )}

      {currentScreen === 'learn-more' && selectedSite && (
        <main style={{ display: 'flex', padding: '0 10%', height: '80vh', alignItems: 'center', gap: '50px', animation: 'fadeIn 0.6s ease' }}>
          <div style={{ flex: 1.2 }}><img src={selectedSite.image_url} alt={selectedSite.Name} style={{ width: '100%', borderRadius: '20px', border: '10px solid #333' }} /></div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '70vh' }} className="custom-scroll">
            <h1 style={{ fontSize: '70px', margin: 0 }}>{selectedSite.Name}</h1>
            <p style={{ color: '#8fc444', fontWeight: 'bold' }}>Date Created: <span style={{color: 'white'}}>{selectedSite.date_made || "Historical"}</span></p>
            <div style={{ marginTop: '15px' }}>
              <p style={{ color: '#8fc444', fontWeight: 'bold', marginBottom: '5px' }}>Current Risk Level:</p>
              <div style={{ padding: '10px 15px', borderLeft: '3px solid #d9534f', background: 'rgba(255,255,255,0.05)' }}>
                <p style={{ margin: 0, fontSize: '24px', color: '#ffecb3', fontWeight: 'bold' }}>{selectedSite.risk_level || "Low"}</p>
              </div>
            </div>
            <h3 style={{marginTop: '20px', color: '#8fc444'}}>History</h3>
            <p style={{ fontSize: '18px', lineHeight: '1.4' }}>{selectedSite.history || "No history recorded yet."}</p>
            <button className="btn-hover" style={actionBtnStyle('#6b7c53')} onClick={() => handleLocateMe(selectedSite)}>Path Finder <span>→</span></button>
            <button className="btn-hover" style={actionBtnStyle('#2d4d2d')} onClick={() => setShowReportForm(true)}>Report <span>→</span></button>
            <button style={{ background: 'none', border: 'none', color: '#8fc444', cursor: 'pointer', marginTop: '20px' }} onClick={() => setSelectedSite(null)}>← Back</button>
          </div>
        </main>
      )}

      {currentScreen === 'report-queue' && (
        <main style={{ padding: '0 10%', height: '85vh', overflowY: 'auto' }}>
          <h1 style={{ fontSize: '50px' }}>Admin Report Queue</h1>
          {reportQueue.length === 0 ? <p>No active reports to evaluate.</p> : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {reportQueue.map(report => (
                <div key={report.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ width: '120px', height: '120px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #8fc444' }}>
                      <img src={report.image_url} alt="Report" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <p style={{fontSize: '22px', color: '#8fc444', margin: 0}}><strong>{report.heritage_sites?.Name}</strong></p>
                      <p><strong>Issue:</strong> {report.description}</p>
                    </div>
                  </div>
                  <button className="btn-hover" style={navBtn} onClick={() => setActiveReport(report)}>Evaluate</button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* MODALS */}
      {(activeReport || showAddModal || showReportForm || showLoginModal || showSuccessModal || showLoginSuccess) && (
        <div style={modalOverlay}>
          <div style={{ background: '#1a2e1a', padding: '30px', borderRadius: '20px', border: '2px solid #8fc444', minWidth: '380px', animation: 'popIn 0.3s ease', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto' }} className="custom-scroll">
            
            {showLoginModal && (
              <>
                <h2>Admin Login</h2>
                <input placeholder="User" style={adminInput} onChange={e => setLoginData({...loginData, user: e.target.value})} />
                <input type="password" placeholder="Pass" style={adminInput} onChange={e => setLoginData({...loginData, pass: e.target.value})} />
                <button className="btn-hover" style={{...navBtn, width: '100%'}} onClick={handleLogin}>Login</button>
                <button style={{background:'none', border:'none', color:'gray', width:'100%', marginTop: '10px', cursor:'pointer'}} onClick={()=>setShowLoginModal(false)}>Cancel</button>
              </>
            )}

            {showLoginSuccess && (
              <div style={{ animation: 'fadeIn 0.4s ease' }}>
                <h2 style={{ color: '#8fc444', margin: '0 0 10px 0' }}>Login Successful</h2>
                <div className="spinner"></div>
                <p style={{ marginBottom: '20px' }}>Admin Dashboard Loaded</p>
                <button className="btn-hover" style={{ ...navBtn, width: '100%', backgroundColor: '#8fc444', color: 'black' }} onClick={() => setShowLoginSuccess(false)}>Continue</button>
              </div>
            )}

            {showAddModal && (
              <>
                <h2 style={{marginTop: 0}}>Add Heritage Site</h2>
                <input placeholder="Name of Site" style={adminInput} value={newSite.Name} onChange={e => setNewSite({...newSite, Name: e.target.value})} />
                
                {/* PREVIEW BOX */}
                <div style={previewBox}>
                  {newSite.image_url ? <img src={newSite.image_url} alt="Preview" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <span style={{color:'gray', fontSize:'12px'}}>No Image Selected</span>}
                </div>

                <label style={fileUploadBtn}>
                    📁 {newSite.image_url.startsWith('data:') ? "Change Local Photo" : "Upload Local Photo"}
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={(e) => handleFileUpload(e, 'site')} />
                </label>
                <p style={{fontSize:'10px', color:'gray', margin:'-5px 0 5px 0'}}>— OR —</p>
                <input placeholder="Paste Image URL" style={adminInput} value={newSite.image_url.startsWith('data:') ? '' : newSite.image_url} onChange={e => setNewSite({...newSite, image_url: e.target.value})} />
                
                <div style={{display:'flex', gap:'10px'}}>
                  <input placeholder="Latitude" style={adminInput} value={newSite.latitude} onChange={e => setNewSite({...newSite, latitude: e.target.value})} />
                  <input placeholder="Longitude" style={adminInput} value={newSite.longitude} onChange={e => setNewSite({...newSite, longitude: e.target.value})} />
                </div>

                <div style={{background:'rgba(255,255,255,0.05)', padding:'10px', borderRadius:'5px', marginBottom:'10px', border:'1px solid #333'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px', justifyContent:'center', marginBottom: isNaturalFormation ? '0' : '10px'}}>
                      <input type="checkbox" id="natural" checked={isNaturalFormation} onChange={(e) => setIsNaturalFormation(e.target.checked)} />
                      <label htmlFor="natural" style={{fontSize:'14px', cursor:'pointer'}}>Natural Formation Site</label>
                  </div>
                  {!isNaturalFormation && (
                      <input type="date" style={{...adminInput, marginBottom: 0}} value={newSite.date_made} onChange={e => setNewSite({...newSite, date_made: e.target.value})} />
                  )}
                </div>

                <textarea placeholder="History/Description" style={{...adminInput, height:'80px'}} value={newSite.history} onChange={e => setNewSite({...newSite, history: e.target.value})} />
                
                <button className="btn-hover" style={{...navBtn, width: '100%', background: '#8fc444', color: '#000', fontWeight:'bold'}} onClick={handleAddSite}>Save Heritage Site</button>
                <button style={{background:'none', border:'none', color:'gray', width:'100%', marginTop: '10px', cursor:'pointer'}} onClick={()=>setShowAddModal(false)}>Cancel</button>
              </>
            )}

            {showReportForm && (
              <>
                <h3 style={{marginTop: 0}}>Report Site Issue</h3>
                
                <div style={previewBox}>
                  {reportData.img ? <img src={reportData.img} alt="Report Preview" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <span style={{color:'gray', fontSize:'12px'}}>No Proof Photo</span>}
                </div>

                <label style={fileUploadBtn}>
                    📁 {reportData.img.startsWith('data:') ? "Change Local Photo" : "Upload Local Photo"}
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={(e) => handleFileUpload(e, 'report')} />
                </label>
                <p style={{fontSize:'10px', color:'gray', margin:'-5px 0 5px 0'}}>— OR —</p>
                <input placeholder="Paste Image URL" style={adminInput} value={reportData.img.startsWith('data:') ? '' : reportData.img} onChange={e => setReportData({...reportData, img: e.target.value})} />
                
                <textarea placeholder="Describe the damage or concern..." style={{...adminInput, height: '100px'}} value={reportData.desc} onChange={e => setReportData({...reportData, desc: e.target.value})} />
                
                <button className="btn-hover" disabled={isSubmitting} style={{...navBtn, width: '100%', background: '#8fc444', color: '#000', fontWeight:'bold'}} onClick={handleSubmitReport}>
                  {isSubmitting ? "Uploading..." : "Submit Report"}
                </button>
                <button style={{background:'none', border:'none', color:'gray', width:'100%', marginTop: '10px', cursor:'pointer'}} onClick={()=>setShowReportForm(false)}>Cancel</button>
              </>
            )}

            {showSuccessModal && (
              <div style={{ textAlign: 'center' }}>
                <div style={{fontSize: '50px', marginBottom: '10px'}}>✅</div>
                <h2 style={{color: '#8fc444', margin: '0 0 20px 0'}}>Success!</h2>
                <button className="btn-hover" style={{...navBtn, width: '100%'}} onClick={() => setShowSuccessModal(false)}>Close</button>
              </div>
            )}

            {activeReport && (
              <>
                <h2>Evaluate Damage</h2>
                <div style={{...previewBox, height: '180px'}}>
                  <img src={activeReport.image_url} alt="Evidence" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                </div>
                <p style={{textAlign:'left', fontSize:'14px', marginBottom:'15px'}}><strong>User Description:</strong> {activeReport.description}</p>
                
                <label style={{display:'block', textAlign:'left', fontSize:'12px', color:'#8fc444'}}>Damage Type</label>
                <select style={adminInput} onChange={e => setEvaluationData({...evaluationData, type: e.target.value})}>
                    <option>Crack</option><option>Weathering</option><option>Vandalism</option><option>Erosion</option><option>Pollution</option>
                </select>
                
                <label style={{display:'block', textAlign:'left', fontSize:'12px', color:'#8fc444'}}>Severity Level</label>
                <select style={adminInput} onChange={e => setEvaluationData({...evaluationData, level: e.target.value})}>
                    <option>Low</option><option>Moderate</option><option>High</option>
                </select>
                
                <button className="btn-hover" style={{...navBtn, width: '100%', background: '#8fc444', color: '#000', fontWeight:'bold'}} onClick={handleCompleteEvaluation}>Complete Evaluation</button>
                <button style={{background:'none', border:'none', color:'gray', width:'100%', marginTop: '10px', cursor:'pointer'}} onClick={()=>setActiveReport(null)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;