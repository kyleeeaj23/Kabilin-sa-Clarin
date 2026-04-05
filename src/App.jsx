import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import './style.css';
import backgroundVideo from './assets/FINAL_BACKGROUND.mp4';
import aboutContent from './assets/ABOUT_CONTENT.png';
import mainScreenImg from './assets/main_screen.png';

// NEW ASSET IMPORTS
import backgroundofwhite from './assets/backgroundofwhite.png';
import sugong1 from './assets/Sugong1.jfif';
import sugong2 from './assets/Sugong2.jfif';
import saint1 from './assets/Saint1.jfif';
import saint2 from './assets/Saint2.jpg';
import lastBackground from './assets/LASTBG.png';

// HAZARD MAP IMPORTS
import earthquakeLandslide from './assets/EARTHQUAKE-INDUCED LANDSLIDE.jpg';
import groundShaking from './assets/GROUND SHAKING.jpg';
import rainLandslide from './assets/RAIN-INDUCED LANDSLIDE.jpg';
import liquefaction from './assets/LIQUEFACTION.jpg';
import stormSurge from './assets/STORM SURGE.jpg';
import tsunami from './assets/TSUNAMI.jpg';

function App() {
  // Screen state to handle full page transitions
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isLoadingScreen, setIsLoadingScreen] = useState(false); // State for the 2s transition
  const [loadingText, setLoadingText] = useState("LOADING SITES & AUTH..."); // Custom loading text
  const [heritageSites, setHeritageSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSite, setNewSite] = useState({
    Name: '', image_url: '', history: '', date_made: '', risk_level: 'Low', latitude: '', longitude: '', risk_score: 0, short_description: ''
  });

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportData, setReportData] = useState({ desc: '', img: '' });
  
  // States to handle tracking the report queue
  const [reportQueue, setReportQueue] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [reportAnimationKey, setReportAnimationKey] = useState(0);

  const clarinFacts = [
  "Clarin was formerly known as 'Can-ogong' before its conversion into a municipality.",
  "The municipality is heavily acknowledged for its historic and beautiful heritage landmarks.",
  "Agriculture and fishing serve as the primary foundational livelihoods for the people of Clarin.",
  "The town was officially organized as its own independent municipality on January 31, 1919.",
  "Clarin is a coastal municipality that directly faces the rich marine waters of the Bohol Strait."
];

  const [evaluationData, setEvaluationData] = useState({ type: 'Crack', level: 'Low' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNaturalFormation, setIsNaturalFormation] = useState(false);

  // EDIT MODE STATES
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedSite, setEditedSite] = useState(null);

  // SLIDESHOW STATE FOR HERITAGE DETAILS
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // SCROLLING STATES
  const [activePart, setActivePart] = useState(0);

  // REF TO TRACK SCROLL DIRECTION
  const lastScrollY = useRef(0);
  const [_scrollDirection, setScrollDirection] = useState('down');

  // Intersection observer state to trigger hazard map animations
  const [_hazardVisible, setHazardVisible] = useState(false);
  const [hazardActiveIndex, setHazardActiveIndex] = useState(0); // number of cards currently active (0..6)
  const [hazardLeaving, setHazardLeaving] = useState(false);
  const hazardRef = useRef(null);
  const hazardTimeoutsRef = useRef([]);

  const clearHazardTimeouts = () => {
    hazardTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    hazardTimeoutsRef.current = [];
  };

  const animateHazardsIn = useCallback(() => {
    clearHazardTimeouts();
    setHazardLeaving(false);
    setHazardVisible(true);
    setHazardActiveIndex(0);
    for (let i = 0; i < 6; i++) {
      const timeoutId = setTimeout(() => {
        setHazardActiveIndex((prev) => Math.max(prev, i + 1));
      }, i * 140);
      hazardTimeoutsRef.current.push(timeoutId);
    }
  }, []);

  const animateHazardsOut = useCallback(() => {
    clearHazardTimeouts();
    setHazardLeaving(true);
    for (let i = 5; i >= 0; i--) {
      const timeoutId = setTimeout(() => {
        setHazardActiveIndex(i);
      }, (5 - i) * 120);
      hazardTimeoutsRef.current.push(timeoutId);
    }
    // Final step after reverse: hide all
    hazardTimeoutsRef.current.push(setTimeout(() => {
      setHazardVisible(false);
      setHazardLeaving(false);
      setHazardActiveIndex(0);
    }, 6 * 120));
  }, []);

  const handleFileUpload = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'site') setNewSite({ ...newSite, image_url: reader.result });
        if (target === 'report') setReportData({ ...reportData, img: reader.result });
        if (target === 'edit_main') setEditedSite({ ...editedSite, image_url: reader.result });
        if (target === 'edit_additional') {
          const currentImages = editedSite.additional_images || [];
          setEditedSite({ ...editedSite, additional_images: [...currentImages, reader.result] });
        }
      };
      reader.readAsDataURL(file);
    }
  };

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

  // Slideshow Logic for Heritage Detail View
  useEffect(() => {
    setCurrentImageIndex(0); // Reset on selection
  }, [selectedSite]);

  useEffect(() => {
    if (selectedSite && selectedSite.additional_images && selectedSite.additional_images.length > 0) {
      const totalImages = [selectedSite.image_url, ...selectedSite.additional_images].length;
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % totalImages);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedSite]);

  const riskWeights = {
    'Crack': { 'Low': 1.0, 'Moderate': 1.2, 'High': 1.5 },
    'Weathering': { 'Low': 0.7, 'Moderate': 1.0, 'High': 1.3 },
    'Vandalism': { 'Low': 0.5, 'Moderate': 1.0, 'High': 1.5 },
    'Erosion': { 'Low': 0.8, 'Moderate': 1.1, 'High': 1.4 },
    'Pollution': { 'Low': 0.6, 'Moderate': 0.9, 'High': 1.2 }
  };

  const handleLogin = () => {
    if (loginData.user.trim() === 'admin' && loginData.pass.trim() === '1234') {
      setShowLoginModal(false);
      setLoadingText("LOGGING IN AS ADMIN...");
      setIsLoadingScreen(true);
      setTimeout(() => {
        setIsLoggedIn(true);
        setIsLoadingScreen(false);
        setLoginData({ user: '', pass: '' }); // Fix: Clears credentials after successful login
      }, 2000);
    } else { alert("Invalid Credentials"); }
  };


  const handleLogout = () => {
    setLoadingText("LOGGING OUT...");
    setIsLoadingScreen(true);
    setTimeout(() => {
      setIsLoggedIn(false);
      setIsLoadingScreen(false);
      if (currentScreen === 'report_queue') setCurrentScreen('heritage');
    }, 2000);
  };

  const handleLearnMore = () => {
    setLoadingText("LOADING HERITAGE SITES...");
    setIsLoadingScreen(true);
    setTimeout(() => {
      setIsLoadingScreen(false);
      setCurrentScreen('heritage');
    }, 2000);
  };

  const handleNavigationWithFact = (callback) => {
  const randomFact = clarinFacts[Math.floor(Math.random() * clarinFacts.length)];
  setLoadingText(randomFact);
  setIsLoadingScreen(true);

  setTimeout(() => {
    callback();
    setIsLoadingScreen(false);
  }, 2000);
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
    const newTotalPoints = (currentSite.risk_score || 0) + addedPoints;

    let finalRiskCategory = 'Low';
    if (newTotalPoints > 15.0) finalRiskCategory = 'High';
    else if (newTotalPoints > 8.0) finalRiskCategory = 'Moderate';

    await supabase.from('heritage_sites').update({
      risk_level: finalRiskCategory,
      risk_score: newTotalPoints
    }).eq('id', activeReport.site_id);

    await supabase.from('heritage_reports').delete().eq('id', activeReport.id);

    setShowSuccessModal(true);
    setActiveReport(null);
    fetchReportQueue();
    fetchSites();
    if (selectedSite) setSelectedSite({ ...currentSite, risk_level: finalRiskCategory, risk_score: newTotalPoints });
  }

  async function handleAddSite() {
    const { Name, image_url, history, date_made, latitude, longitude, risk_level, risk_score, short_description } = newSite;
    const finalDateValue = isNaturalFormation ? "Natural Formation" : date_made;

    if (!Name || !image_url || !history || !short_description || !finalDateValue || !latitude || !longitude) {
      return alert("Admin, please fill up all fields. Ensure either a Photo is uploaded/linked and a Date is chosen/checked.");
    }

    const { error } = await supabase.from('heritage_sites').insert([
      { Name, image_url, history, date_made: finalDateValue, latitude, longitude, risk_level, risk_score, short_description, additional_images: [] }
    ]);

    if (!error) {
      setShowAddModal(false);
      fetchSites();
      setNewSite({ Name: '', image_url: '', history: '', date_made: '', risk_level: 'Low', latitude: '', longitude: '', risk_score: 0, short_description: '' });
      setIsNaturalFormation(false);
      setShowSuccessModal(true);
    } else {
      alert("Error: " + error.message);
    }
  }

  const handleEditSiteClick = () => {
    setEditedSite({ ...selectedSite });
    setIsEditMode(true);
  };

  const handleSaveEditedSite = async () => {
    const { error } = await supabase.from('heritage_sites').update({
      Name: editedSite.Name,
      image_url: editedSite.image_url,
      history: editedSite.history,
      date_made: editedSite.date_made,
      latitude: editedSite.latitude,
      longitude: editedSite.longitude,
      risk_level: editedSite.risk_level,
      short_description: editedSite.short_description,
      additional_images: editedSite.additional_images
    }).eq('id', editedSite.id);

    if (!error) {
      setIsEditMode(false);
      setSelectedSite(editedSite);
      fetchSites();
      setShowSuccessModal(true);
    } else {
      alert("Error saving site: " + error.message);
    }
  };

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

  // TRACK SCROLL DIRECTION
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // INTERSECTION OBSERVER
  useEffect(() => {
    if (currentScreen !== 'home') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionNum = parseInt(entry.target.getAttribute('data-section'));
            setActivePart(sectionNum);
          }
        });
      },
      { threshold: 0.2 }
    );

    const sections = document.querySelectorAll('.scroll-section');
    sections.forEach((section) => observer.observe(section));

    return () => sections.forEach((section) => observer.unobserve(section));
  }, [currentScreen]);

  // Specific observer for Hazard Maps bouncing animation with in/out sequential behavior
  useEffect(() => {
    if (currentScreen !== 'home' || !hazardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animateHazardsIn();
        } else {
          animateHazardsOut();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(hazardRef.current);

    return () => {
      observer.disconnect();
      clearHazardTimeouts();
    };
  }, [currentScreen, animateHazardsIn, animateHazardsOut]);

  const actionBtnStyle = (color) => ({ width: '100%', padding: '15px 25px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', transition: 'transform 0.2s ease' });
  const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300 };
  
  // Fix: Added boxSizing: 'border-box' so inputs align perfectly with buttons
  const adminInput = { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #5d6f41', background: '#0a1a0a', color: 'white', boxSizing: 'border-box' };
  const fileUploadBtn = { display: 'block', width: '100%', padding: '10px', background: '#0a1a0a', color: 'white', borderRadius: '5px', marginBottom: '10px', cursor: 'pointer', border: '1px dashed #5d6f41', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' };
  const previewBox = { width: '100%', height: '120px', borderRadius: '10px', border: '1px solid #5d6f41', marginBottom: '10px', overflow: 'hidden', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center' };

  // DYNAMIC CIRCLE STYLING BASED ON SCROLL POSITION & DIRECTION
  const getCircleTransform = () => {
    if (activePart === 4) {
      return 'translate(calc(100vw - 500px), -50px) rotate(0deg)'; // Changed 50px to -50px
    } else if (activePart === 5) {
      return 'translate(-300px, 80%) rotate(-360deg)'; // Changed 80% to 40%
    } else if (activePart < 4) {
      return 'translate(100vw, -50px) rotate(90deg)'; // Changed 50px to -50px
    } else {
      return 'translate(-600px, 80%) rotate(-720deg)'; // Changed 120% to 80%
    }
  };

  // Combine site image and additional images into an array for slideshow
  const getSiteImages = () => {
    if (!selectedSite) return [];
    const arr = [selectedSite.image_url];
    if (selectedSite.additional_images && Array.isArray(selectedSite.additional_images)) {
      return [...arr, ...selectedSite.additional_images];
    }
    return arr;
  };

  const imagesForSlide = getSiteImages();

  const getHazardCardClass = (index) => {
    const base = 'hazard-card';
    if (index < hazardActiveIndex) return `${base} visible`;
    if (hazardLeaving && index >= hazardActiveIndex) return `${base} exit`;
    return base;
  };

  return (
    <div style={{ width: '100vw', position: 'relative', color: 'white', fontFamily: "'Inter', sans-serif", backgroundColor: '#fff', overflowX: 'hidden' }}>

      <style>{`
        @import url('https://fonts.cdnfonts.com/css/garet');
        @import url('https://rsms.me/inter/inter.css');

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-16px); }
          60% { transform: translateY(-8px); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        .spinner { border: 4px solid rgba(93, 111, 65, 0.3); border-top: 4px solid #5d6f41; border-radius: 50%; width: 40px; height: 40px;
        animation: spin 1s linear infinite; margin: 20px auto; }
        .site-card:hover { transform: scale(1.02); background-color: rgba(90, 110, 70, 0.9) !important; }
        .btn-hover:hover { transform: translateY(-2px); filter: brightness(1.2); }
        .custom-scroll::-webkit-scrollbar { display: none; }

        .nav-link-btn { font-family: 'Inter', sans-serif; background: transparent; border: none; padding: 6px 22px; color: white; cursor: pointer; transition: all 0.3s ease;
        }
        .nav-pill-btn { font-family: 'Inter', sans-serif; border: 1px solid #5d6f41; padding: 6px 22px; border-radius: 25px; color: white; cursor: pointer;
        transition: all 0.3s ease; }

        .prompt-container { position: relative; height: 1.2em; overflow: hidden; width: 100%; }
        .text-slide-default { position: absolute; top: 0; left: 0; transition: transform 0.3s ease, opacity 0.3s ease; opacity: 1; }
        .text-slide-hover { position: absolute; top: 0; left: 0; transform: translateY(100%); transition: transform 0.3s ease, opacity 0.3s ease; opacity: 0;
        color: #ffecb3; font-weight: bold; }

        .site-card:hover .text-slide-default { transform: translateY(-100%); opacity: 0; }
        .site-card:hover .text-slide-hover { transform: translateY(0); opacity: 1; }

        .hazard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; width: 100%; max-width: 1200px; margin-top: 40px; }
        .hazard-card { background-color: #2b2b2b; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.2); transition: transform 0.3s ease, opacity 0.25s ease; opacity: 0; transform: translateY(25px) scale(0.95); }
        .hazard-card:hover { transform: translateY(-10px) scale(1.02); }
        .hazard-card img { width: 100%; height: 200px; object-fit: cover; }
        .hazard-card h3 { font-family: 'Garet', sans-serif; font-size: 16px; font-weight: bold; text-align: center; padding: 15px; margin: 0; color: #fff; }

        .hazard-card.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          animation: hazard-pop 0.65s cubic-bezier(0.2, 1, 0.3, 1);
        }

        .hazard-card.exit {
          animation: hazard-pop-reverse 0.5s cubic-bezier(0.3, 0.1, 0.4, 1) forwards;
        }

        @keyframes hazard-pop {
          0% { transform: translateY(30px) scale(0.85); opacity: 0; }
          55% { transform: translateY(-12px) scale(1.05); opacity: 1; }
          75% { transform: translateY(4px) scale(0.98); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }

        @keyframes hazard-pop-reverse {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          40% { transform: translateY(-8px) scale(1.03); }
          100% { transform: translateY(32px) scale(0.86); opacity: 0; }
        }

        .know-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; width: 100%; max-width: 1200px; margin-top: 20px; }
        .know-card { background: rgba(255, 255, 255, 0.9); border-radius: 15px; padding: 25px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); text-align: left;
        transition: transform 0.3s ease; }
        .know-card:hover { transform: translateY(-5px); }
        .know-card h3 { font-family: 'Garet', sans-serif; color: #1a1a1a; margin: 0 0 10px 0; font-size: 18px; }
        .know-card p { font-family: 'Inter', sans-serif; color: #555; font-size: 14px; line-height: 1.5; margin: 0; }

        .transparent-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
          color: #fff;
        }

        .slideshow-img {
          width: 100%;
          display: block;
          transition: opacity 0.5s ease-in-out;
        }

        /* Fix: Animated badges for Clarin visual aesthetics */
        .aesthetic-badge {
          position: absolute;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: #5d6f41;
          color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          animation: float 4s ease-in-out infinite;
          z-index: 5;
        }
      `}</style>

      {/* FIXED NAVBAR */}
      <nav style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '15px 60px', gap: '15px',
        position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(5px)', boxSizing: 'border-box'
      }}>
        <button className="nav-link-btn btn-hover" onClick={() => handleNavigationWithFact(() => { setCurrentScreen('home'); window.scrollTo({ top: 0 }); })}>Home</button>
        {currentScreen === 'home' && (
          <button className="nav-link-btn btn-hover" onClick={() => document.getElementById('about-section').scrollIntoView({ behavior: 'smooth' })}>About Us</button>
        )}

        {isLoggedIn && <button className="nav-pill-btn btn-hover" style={{ backgroundColor: '#5d6f41', color: '#fff' }} onClick={() => setShowAddModal(true)}>Add Site</button>}
        {isLoggedIn && <button className="nav-pill-btn btn-hover" style={{ backgroundColor: '#e67e22', color: '#fff' }} onClick={() => { if (currentScreen === 'report_queue') setCurrentScreen('heritage'); else setCurrentScreen('report_queue'); }}>{currentScreen === 'report_queue' ? "Heritage View" : "Report Queue"}</button>}

        <button className="nav-link-btn btn-hover" onClick={() => isLoggedIn ? handleLogout() : setShowLoginModal(true)}>{isLoggedIn ? "Log-out" : "Log-in"}</button>
      </nav>

      {/* 2-SECOND LOADING SCREEN PORTAL */}
      {isLoadingScreen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#1a1a1a', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 999, animation: 'fadeIn 0.3s ease' }}>
          <div className="spinner" style={{ 
          width: '60px', 
            height: '60px',
            borderTop: loadingText === "Logging Out..." ? '4px solid #e67e22' : '4px solid #5d6f41'
            }}></div>
          <h2 style={{ fontFamily: "'Garet', sans-serif", marginTop: '20px', letterSpacing: '2px' }}>{loadingText}</h2>
        </div>
      )}


      {/* SCREEN 1: HOME PAGE */}
      {currentScreen === 'home' && (
        <>
          {/* PICTURE 1: HERO */}
          <section data-section="1" className="scroll-section" style={{ height: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
            <video src={backgroundVideo} autoPlay loop muted playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, top: 0, left: 0 }} />
            <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 2, top: 0, left: 0 }} />

            <main style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '10%', height: '100%', animation: 'slideUp 0.8s ease' }}>
              <div style={{ fontSize: '35px', fontWeight: '450',fontFamily: "'Inter', sans-serif", marginLeft: '15px' }}>Kabilin sa</div>
              <h1 style={{ fontSize: '130px', fontWeight: '900', margin: 0, fontFamily: "'Garet', sans-serif" }}>Clarin</h1>

              <button className="btn-hover" onClick={handleLearnMore} style={{ position: 'absolute', bottom: '100px', right: '80px', padding: '12px 60px', fontSize: '24px', background: 'transparent', borderRadius: '4px', cursor: 'pointer', border: 'none', color: '#fff', fontWeight: 'bold', fontFamily: "'Inter', sans-serif" }}>  Learn More →  </button>
            </main>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '150px', background: 'linear-gradient(to bottom, transparent, #fff)', pointerEvents: 'none', zIndex: 3 }} />
          </section>

          {/* THE MISTY BACKGROUND WRAPPER - Extends all across white sections */}
          <div style={{ position: 'relative', zIndex: 2, overflow: 'hidden', backgroundColor: '#ffffff' }}>

            {/* The absolute background layer with defined opacity */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0,
              backgroundImage: `url(${backgroundofwhite})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
              opacity: 0.08,
            }} />


            {/* PICTURE 2: ABOUT US FEATURE */}
            <section id="about-section" data-section="2" className="scroll-section" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 2 }}>
              <div style={{ maxWidth: '1200px', width: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
                <h2 style={{ fontFamily: "'Garet', sans-serif", fontSize: '45px', color: '#333', marginTop: '50px', marginBottom: 0 }}>About Us</h2>
                <img src={aboutContent} alt="About Us" style={{ width: '100%', borderRadius: '20px', border: '2px solid #5d6f41', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
              </div>
            </section>

            {/* PICTURE 3: CLARIN HAZARD MAPS */}
            <section ref={hazardRef} data-section="3" className="scroll-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 2, padding: '80px 0' }}>
              <h2 style={{ fontFamily: "'Garet', sans-serif", fontSize: '45px', color: '#333', margin: '0 0 10px 0' }}>Clarin Hazard Maps</h2>
              <p style={{ fontFamily: "'Inter', sans-serif", color: '#666', fontSize: '18px', marginBottom: '30px' }}>Review the municipality risk factors.</p>

              {/* Sequential pop bounce in/out by visible index */}
              <div className="hazard-grid">
                <div className={getHazardCardClass(0)}><img src={earthquakeLandslide} alt="Earthquake" /><h3>EARTHQUAKE-INDUCED LANDSLIDE</h3></div>
                <div className={getHazardCardClass(1)}><img src={groundShaking} alt="Ground Shaking" /><h3>GROUND SHAKING</h3></div>
                <div className={getHazardCardClass(2)}><img src={rainLandslide} alt="Rain Landslide" /><h3>RAIN-INDUCED LANDSLIDE</h3></div>
                <div className={getHazardCardClass(3)}><img src={liquefaction} alt="Liquefaction" /><h3>LIQUEFACTION</h3></div>
                <div className={getHazardCardClass(4)}><img src={stormSurge} alt="Storm Surge" /><h3>STORM SURGE</h3></div>
                <div className={getHazardCardClass(5)}><img src={tsunami} alt="TSUNAMI" /><h3>TSUNAMI</h3></div>
              </div>
            </section>

            {/* "KNOW CLARIN" EXPANDED CONTENT SECTION */}
            <section style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '60px 0' }}>
              <h1 style={{ fontSize: '90px', fontWeight: '900', margin: 0, color: '#1a1a1a', fontFamily: "'Garet', sans-serif", letterSpacing: '-2px' }}>Know Clarin!</h1>
              <p style={{ fontFamily: "'Inter', sans-serif", color: '#666', fontSize: '18px', marginBottom: '40px' }}>Discover the rich culture and geography that define our beloved municipality.</p>

              <div className="know-grid">
                <div className="know-card">
                  <h3>Cultural Heritage</h3>
                  <p>Clarin preserves an incredibly rich array of traditional customs and crafts that have successfully been passed down spanning across multiple generations.</p>
                </div>
                <div className="know-card">
                  <h3>Rich Eco-Tourism</h3>
                  <p>From our lush agricultural fields to pristine coastal lines, our local natural ecosystems are heavily preserved to sustain life and foster regional beauty.</p>
                </div>
                <div className="know-card">
                  <h3>A Unified Community</h3>
                  <p>What truly shapes the town of Clarin is the pure resilience, deep-rooted faith, and warm hospitality of its loving local citizens.</p>
                </div>
              </div>
            </section>

            {/* THE PERFECT ROLLING CIRCLE (Kept on top of the wrapper background) */}
            <div style={{
              position: 'absolute',
              width: '800px',
              height: '800px',
              zIndex: 1,
              pointerEvents: 'none',
              borderRadius: '50%',
              backgroundColor: activePart === 4 ? '#3a2f2a' : '#787a8b',
              transition: 'transform 1.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 1.4s ease',
              transform: getCircleTransform(),
            }} />

            {/* PICTURE 4: THE SUGONG FESTIVAL */}
            <section data-section="4" className="scroll-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10%', position: 'relative', zIndex: 2 }}>

              <div style={{
                width: '45%',
                transition: 'transform 1s ease, opacity 1s ease',
                transform: activePart === 4 ? 'translateX(0)' : 'translateX(-50px)',
                opacity: activePart === 4 ? 1 : 0
              }}>
                <h2 style={{ fontFamily: "'Garet', sans-serif", fontSize: '50px', color: '#3a2f2a', marginBottom: '20px' }}>The Sugong Festival</h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '18px', color: '#555', lineHeight: '1.6' }}>
                  The Sugong Festival is Clarin's vibrant celebration of its heritage and Foundation Day, named after the traditional bamboo tubes used to collect tuba (coconut wine).
                  The streets come alive with energetic dancing and colorful costumes that honor the town's rich agricultural roots.
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '18px', color: '#555', lineHeight: '1.6' }}>
                  Beyond the music, it is a powerful symbol of unity and progress, bringing the community together to honor its cherished traditions and celebrate a bright, resilient future.
                </p>
              </div>

              <div style={{
                width: '45%',
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                alignItems: 'flex-end',
                transition: 'transform 1s ease 0.2s, opacity 1s ease 0.2s',
                transform: activePart === 4 ? 'translateX(0)' : 'translateX(50px)',
                opacity: activePart === 4 ? 1 : 0
              }}>
                <img src={sugong1} alt="Sugong 1" style={{ width: '450px', height: '280px', objectFit: 'cover', borderRadius: '15px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }} />
                <img src={sugong2} alt="Sugong 2" style={{ width: '450px', height: '280px', objectFit: 'cover', borderRadius: '15px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }} />
              </div>
            </section>

            {/* PICTURE 5: SAINT MICHAEL */}
            <section data-section="5" className="scroll-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: '0 10%', position: 'relative', zIndex: 2 }}>

              <div style={{
                width: '45%',
                transition: 'transform 1s ease, opacity 1s ease',
                transform: activePart === 5 ? 'translateX(0)' : 'translateX(50px)',
                opacity: activePart === 5 ? 1 : 0
              }}>
                <h2 style={{ fontFamily: "'Garet', sans-serif", fontSize: '50px', color: '#787a8b', marginBottom: '20px', textAlign: 'right' }}>St. Michael the Archangel</h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '18px', color: '#555', lineHeight: '1.6', textAlign: 'right' }}>
                  As the patron saint of Clarin, St. Michael the Archangel serves as the town's ultimate symbol of courage, protection, and unwavering faith.
                  Clarinians unite annually to express their deep-rooted gratitude and communal strength.
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '18px', color: '#555', lineHeight: '1.6', textAlign: 'right' }}>
                  From those ruins, Clarinians united to rebuild their sanctuary, perfectly mirroring the triumphant and resilient nature of their heavenly defender. Today, honoring St. Michael is a celebration of the town's ability to overcome any challenge and stand strong together.
                </p>
              </div>

              <div style={{
                width: '45%',
                display: 'flex',
                flexDirection: 'column',
                gap: '30px',
                alignItems: 'flex-start',
                transition: 'transform 1s ease 0.2s, opacity 1s ease 0.2s',
                transform: activePart === 5 ? 'translateX(0)' : 'translateX(-50px)',
                opacity: activePart === 5 ? 1 : 0
              }}>
                <img src={saint1} alt="Saint 1" style={{ width: '450px', height: '280px', objectFit: 'cover', borderRadius: '15px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }} />
                <img src={saint2} alt="Saint 2" style={{ width: '450px', height: '280px', objectFit: 'cover', borderRadius: '15px', boxShadow: '0 10px 20px rgba(0,0,0,0.15)' }} />
              </div>
            </section>
          </div>

          {/* PICTURE 6: LAST PART */}
          <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 2, padding: '0 10%', backgroundImage: `url(${lastBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '300px', background: 'linear-gradient(to bottom, #fff, transparent)', pointerEvents: 'none' }} />
          </section>
        </>
      )}

      {/* SCREEN 2: DEDICATED HERITAGE LIST */}
      {currentScreen === 'heritage' && (
        <section style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video src={backgroundVideo} autoPlay loop muted playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, top: 0, left: 0 }} />
          <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundImage: `url(${backgroundofwhite})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'rgba(0, 0, 0, 0.65)', backgroundBlendMode: 'overlay', zIndex: 2, top: 0, left: 0, opacity: 0.1 }} />
          <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 2, top: 0, left: 0 }} />

          <div style={{ position: 'relative', zIndex: 3, width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
            {!selectedSite ? (
              <div style={{ padding: '0 5%', width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', animation: 'fadeIn 0.5s ease', gap: '40px', boxSizing: 'border-box' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', maxWidth: '40%' }}>
                  <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', alignSelf: 'flex-start', marginBottom: '20px', fontSize: '16px'}}
                  onClick={() => handleNavigationWithFact(() => setCurrentScreen('home'))}> ← Back to Home</button>
                  <h1 style={{ fontSize: '50px', fontWeight: '600', margin: '0 0 10px 0', fontFamily: "'Garet', sans-serif", color: '#fff', textAlign: 'center' }}>Kabilin sa</h1>
                  <h1 style={{ fontSize: '50px', fontWeight: '600', margin: '0 0 20px 0', fontFamily: "'Garet', sans-serif", color: '#fff', textAlign: 'center' }}>Clarin</h1>
                  <div style={{ width: '85%', height: '240px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.3)' }}>
                    <img src={mainScreenImg} alt="Main Screen" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>

                <div className="custom-scroll" style={{ flex: 1.2, height: '80vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '15px' }}>
                  {heritageSites.map((site) => (
                    <div key={site.id} className="site-card" onClick={() => handleNavigationWithFact(() => setSelectedSite(site))} style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', padding: '25px 30px', borderRadius: '30px', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', gap: '20px', transition: 'all 0.3s ease', minHeight: '140px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {isLoggedIn && (
                        <button onClick={(e) => handleDeleteSite(site.id, e)} style={{ position: 'absolute', top: '10px', right: '10px', background: '#d9534f', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', zIndex: 5 }}>X</button>
                      )}
                      <div style={{ width: '100px', height: '100px', minWidth: '100px', borderRadius: '50%', overflow: 'hidden' }}>
                        <img src={site.image_url} alt={site.Name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontFamily: "'Inter', sans-serif", width: '100%' }}>
                        <div className="prompt-container">
                          <p className="text-slide-default" style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', color: '#e0e0e0' }}> {site.short_description || (site.history ? site.history.slice(0, 100) + '...' : "No description available.")} </p>
                          <p className="text-slide-hover" style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>Explore {site.Name} now!</p>
                        </div>
                        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#fff' }}>{site.Name}</h2>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* DETAILED SITE VIEW */
              <div style={{ display: 'flex', padding: '0 5%', width: '100%', minHeight: '80vh', alignItems: 'center', gap: '50px', animation: 'fadeIn 0.6s ease', boxSizing: 'border-box' }}>
                {/* LEFT SIDE: Image + Action column */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '80vh', boxSizing: 'border-box' }}>
                  <div style={{ width: '100%', borderRadius: '20px', border: '10px solid rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 'auto', position: 'relative' }}>
                    {imagesForSlide.length > 1 ? (
                      <img
                        key={currentImageIndex}
                        src={imagesForSlide[currentImageIndex]}
                        alt={selectedSite.Name}
                        className="slideshow-img"
                      />
                    ) : (
                      <img src={selectedSite.image_url} alt={selectedSite.Name} style={{ width: '100%', display: 'block' }} />
                    )}
                  </div>

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    <button className="btn-hover" style={{ ...actionBtnStyle('#5d6f41'), marginBottom: 0 }} onClick={() => handleLocateMe(selectedSite)}>Path Finder <span> → </span></button>
                    <button className="btn-hover" style={{ ...actionBtnStyle('#274f25'), marginBottom: 0 }} onClick={() => setShowReportForm(true)}>Report <span> → </span></button>
                  </div>
                  <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', alignSelf: 'center', fontSize: '16px', padding: '10px'}} onClick={() => handleNavigationWithFact(() => {setSelectedSite(null); setIsEditMode(false); })}> ← Back to List </button>
                </div>

                {/* RIGHT SIDE: Text Data or Edit Controls */}
                <div style={{ flex: 1.2, fontFamily: "'Inter', sans-serif", color: '#fff', display: 'flex', flexDirection: 'column', height: '80vh', position: 'relative' }}>
                  {isLoggedIn && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '10px' }}>
                      <button onClick={handleEditSiteClick} style={{ background: '#5d6f41', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 15px', cursor: 'pointer' }}>Edit</button>
                      <button onClick={(e) => { handleDeleteSite(selectedSite.id, e); setSelectedSite(null); }} style={{ background: '#d9534f', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 15px', cursor: 'pointer' }}>X</button>
                    </div>
                  )}

                  {!isEditMode ? (
                    <>
                      <h1 style={{ fontSize: '60px', margin: '0 0 20px 0', fontFamily: "'Garet', sans-serif" }}>{selectedSite.Name}</h1>
                      <div className="custom-scroll" style={{ overflowY: 'auto', flex: 1, paddingRight: '15px' }}>
                        <p style={{ fontWeight: 'bold' }}>Date Created: <span>{selectedSite.date_made || "Historical"}</span></p>
                        <div style={{ margin: '15px 0' }}>
                          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Current Risk Level:</p>
                          <div style={{ padding: '10px 15px', borderLeft: '3px solid #d9534f', background: 'rgba(255,255,255,0.05)' }}>
                            <p style={{ margin: 0, fontSize: '24px', color: '#5d6f41', fontWeight: 'bold' }}>{selectedSite.risk_level || "Low"}</p>
                          </div>
                        </div>
                        <h3 style={{ marginTop: '20px' }}>History</h3>
                        <p style={{ fontSize: '16px', lineHeight: '1.4', color: '#e0e0e0', textAlign: 'justify' }}>{selectedSite.history}</p>
                      </div>
                    </>
                  ) : (
                    /* EDIT MODE FORM CONTAINER */
                    <div className="custom-scroll" style={{ overflowY: 'auto', flex: 1, paddingRight: '15px' }}>
                      <h2 style={{ fontFamily: "'Garet', sans-serif" }}>Edit Heritage Site</h2>
                      <label>Name:</label>
                      <input style={adminInput} value={editedSite.Name} onChange={e => setEditedSite({ ...editedSite, Name: e.target.value })} />

                      <label>Short Description:</label>
                      <input style={adminInput} value={editedSite.short_description} onChange={e => setEditedSite({ ...editedSite, short_description: e.target.value })} />

                      <label>History:</label>
                      <textarea style={{ ...adminInput, height: '100px' }} value={editedSite.history} onChange={e => setEditedSite({ ...editedSite, history: e.target.value })} />

                      <label>Date Made:</label>
                      <input style={adminInput} value={editedSite.date_made} onChange={e => setEditedSite({ ...editedSite, date_made: e.target.value })} />

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label>Latitude:</label>
                          <input style={adminInput} value={editedSite.latitude} onChange={e => setEditedSite({ ...editedSite, latitude: e.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label>Longitude:</label>
                          <input style={adminInput} value={editedSite.longitude} onChange={e => setEditedSite({ ...editedSite, longitude: e.target.value })} />
                        </div>
                      </div>

                      <label>Main Photo (Base64/URL):</label>
                      <input style={adminInput} value={editedSite.image_url} onChange={e => setEditedSite({ ...editedSite, image_url: e.target.value })} />
                      <label style={fileUploadBtn}>Replace Main Photo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'edit_main')} /></label>

                      <label>Additional Photos (Slideshow Data):</label>
                      <label style={fileUploadBtn}>Add Photos to Slideshow<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'edit_additional')} /></label>

                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {editedSite.additional_images && editedSite.additional_images.map((img, idx) => (
                          <div key={idx} style={{ width: '60px', height: '60px', border: '1px solid #fff', position: 'relative' }}>
                            <img src={img} alt="additional" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', cursor: 'pointer', fontSize: '10px' }}
                              onClick={() => {
                                const filtered = editedSite.additional_images.filter((_, i) => i !== idx);
                                setEditedSite({ ...editedSite, additional_images: filtered });
                              }}
                            >X</button>
                          </div>
                        ))}
                      </div>

                      <button className="btn-hover" style={{ fontFamily: "'Inter', sans-serif", border: 'none', padding: '12px 22px', borderRadius: '5px', width: '100%', background: '#5d6f41', color: '#fff', fontWeight: 'bold' }} onClick={handleSaveEditedSite}>Save Changes</button>
                      <button style={{ background: 'none', border: 'none', color: 'gray', width: '100%', marginTop: '10px', cursor: 'pointer' }} onClick={() => setIsEditMode(false)}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* SCREEN 3: REPORT QUEUE ON ANOTHER PAGE */}
      {currentScreen === 'report_queue' && (
        <section style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video src={backgroundVideo} autoPlay loop muted playsInline style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, top: 0, left: 0 }} />
          <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 2, top: 0, left: 0 }} />

          <div style={{ position: 'relative', zIndex: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 5% 40px 5%', boxSizing: 'border-box' }}>
            <h1 style={{ fontFamily: "'Garet', sans-serif", marginBottom: '30px' }}>Active Reports Queue</h1>

            {activeReport ? (
              /* Fix: Constrained layout and max image sizes to stop overlapping screen bounds */
              <div key={reportAnimationKey} className="fade-in" style={{ display: 'flex', gap: '40px', alignItems: 'flex-start', maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="transparent-card" style={{ flex: 1 }}>
                  <h2>Evaluating: {activeReport.heritage_sites?.Name}</h2>
                  <p><strong>Report:</strong> {activeReport.description}</p>
                  <img src={activeReport.image_url} alt="Report" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '10px', marginTop: '10px', border: '1px solid rgba(255,255,255,0.2)' }} />
                </div>

                <div className="transparent-card" style={{ flex: 1 }}>
                  <h2>Admin Evaluation</h2>
                  <label>Hazard Type</label>
                  <select style={{ ...adminInput, background: '#1a1a1a' }} value={evaluationData.type} onChange={e => setEvaluationData({ ...evaluationData, type: e.target.value })}>
                    {Object.keys(riskWeights).map(type => <option key={type} value={type}>{type}</option>)}
                  </select>

                  <label>Severity Level</label>
                  <select style={{ ...adminInput, background: '#1a1a1a' }} value={evaluationData.level} onChange={e => setEvaluationData({ ...evaluationData, level: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                  </select>

                  <button className="btn-hover" style={{ fontFamily: "'Inter', sans-serif", border: 'none', padding: '12px 22px', borderRadius: '10px', width: '100%', background: '#5d6f41', color: '#fff', fontWeight: 'bold', marginTop: '20px' }} onClick={handleCompleteEvaluation}>Complete Assessment</button>
                  <button style={{ background: 'none', border: 'none', color: 'gray', width: '100%', marginTop: '10px', cursor: 'pointer' }} onClick={() => setActiveReport(null)}>Back to Queue</button>
                </div>
              </div>
            ) : (
              <div className="custom-scroll" style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {reportQueue.length === 0 ? (
                  <p style={{ color: '#ccc' }}>No reports to evaluate.</p>
                ) : (
                  reportQueue.map(report => (
                    <div key={report.id} className="transparent-card" style={{ cursor: 'pointer' }} onClick={() => { setActiveReport(report); setReportAnimationKey(prev => prev + 1); }}>
                      <h3 style={{ margin: '0 0 10px 0', fontFamily: "'Garet', sans-serif" }}>{report.heritage_sites?.Name}</h3>
                      <p style={{ margin: 0, color: '#e0e0e0', fontSize: '14px' }}>{report.description.length > 80 ? report.description.slice(0, 80) + "..." : report.description}</p>
                      <p style={{ marginTop: '15px', color: '#ffecb3', fontSize: '12px' }}>Click to Evaluate</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: '#050a05', border: '2px solid #5d6f41', padding: '40px', borderRadius: '20px', width: '350px', animation: 'popIn 0.3s ease' }}>
            <h2 style={{ fontFamily: "'Garet', sans-serif", marginTop: 0 }}>Admin Log-in</h2>
            <input type="text" placeholder="Username" style={adminInput} value={loginData.user} onChange={e => setLoginData({ ...loginData, user: e.target.value })} />
            <input type="password" placeholder="Password" style={adminInput} value={loginData.pass} onChange={e => setLoginData({ ...loginData, pass: e.target.value })} />
            <button className="btn-hover" style={{ fontFamily: "'Inter', sans-serif", border: 'none', padding: '12px 22px', borderRadius: '10px', width: '100%', background: '#5d6f41', color: '#fff', fontWeight: 'bold' }} onClick={handleLogin}>Log-in</button>
            <button style={{ background: 'none', border: 'none', color: 'gray', width: '100%', marginTop: '10px', cursor: 'pointer' }} onClick={() => setShowLoginModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ADD SITE MODAL */}
      {showAddModal && (
        <div style={modalOverlay}>
          <div className="custom-scroll" style={{ backgroundColor: '#050a05', border: '2px solid #5d6f41', padding: '30px', borderRadius: '20px', width: '500px', maxHeight: '90vh', overflowY: 'auto', animation: 'popIn 0.3s ease' }}>
            <h2 style={{ fontFamily: "'Garet', sans-serif", marginTop: 0 }}>Add New Site</h2>

            <label>Site Name:</label>
            <input type="text" style={adminInput} value={newSite.Name} onChange={e => setNewSite({ ...newSite, Name: e.target.value })} />

            <label>Short Description:</label>
            <input type="text" style={adminInput} value={newSite.short_description} onChange={e => setNewSite({ ...newSite, short_description: e.target.value })} />

            <label>History (Detailed):</label>
            <textarea style={{ ...adminInput, height: '100px' }} value={newSite.history} onChange={e => setNewSite({ ...newSite, history: e.target.value })} />

            <label>Coordinates:</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="Lat" style={adminInput} value={newSite.latitude} onChange={e => setNewSite({ ...newSite, latitude: e.target.value })} />
              <input type="text" placeholder="Long" style={adminInput} value={newSite.longitude} onChange={e => setNewSite({ ...newSite, longitude: e.target.value })} />
            </div>

            <label>Date Created:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <input type="date" style={{ ...adminInput, marginBottom: 0, flex: 1 }} disabled={isNaturalFormation} value={newSite.date_made} onChange={e => setNewSite({ ...newSite, date_made: e.target.value })} />
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={isNaturalFormation} onChange={e => setIsNaturalFormation(e.target.checked)} />
                Natural
              </label>
            </div>

            <label>Photo Source:</label>
            <input type="text" placeholder="Or paste image URL" style={adminInput} value={newSite.image_url} onChange={e => setNewSite({ ...newSite, image_url: e.target.value })} />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ ...fileUploadBtn, flex: 1 }}>Choose File<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'site')} /></label>
              {newSite.image_url && <div style={{ ...previewBox, flex: 1 }}><img src={newSite.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
            </div>

            <button className="btn-hover" style={{ fontFamily: "'Inter', sans-serif", border: 'none', padding: '12px 22px', borderRadius: '10px', width: '100%', background: '#5d6f41', color: '#fff', fontWeight: 'bold', marginTop: '10px' }} onClick={handleAddSite}>Save Heritage Site</button>
            <button style={{ background: 'none', border: 'none', color: 'gray', width: '100%', marginTop: '10px', cursor: 'pointer' }} onClick={() => setShowAddModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {showSuccessModal && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: '#050a05', border: '2px solid #5d6f41', padding: '30px', borderRadius: '20px', width: '300px', textAlign: 'center', animation: 'popIn 0.3s ease' }}>
            <div style={{ fontSize: '50px', marginBottom: '10px' }}> ✅ </div>
            <h2>Action Successful!</h2>
            <button className="btn-hover" style={{ fontFamily: "'Inter', sans-serif", border: '1px solid #5d6f41', background: 'transparent', padding: '10px 22px', borderRadius: '25px', color: 'white', cursor: 'pointer', width: '100%', marginTop: '10px' }} onClick={() => setShowSuccessModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* USER REPORT FORM OVERLAY */}
      {showReportForm && selectedSite && (
        <div style={modalOverlay}>
          <div style={{ backgroundColor: '#050a05', border: '2px solid #274f25', padding: '30px', borderRadius: '20px', width: '400px', animation: 'popIn 0.3s ease' }}>
            <h2 style={{ fontFamily: "'Garet', sans-serif", marginTop: 0 }}>Report Issue</h2>
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>Help us preserve <strong>{selectedSite.Name}</strong> by reporting any damages or concerns.</p>

            <label>Upload Proof/Photo:</label>
            <input type="text" placeholder="Or paste image URL" style={adminInput} value={reportData.img} onChange={e => setReportData({ ...reportData, img: e.target.value })} />
            <label style={fileUploadBtn}>Upload Photo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'report')} /></label>

            <label>Description of Issue:</label>
            <textarea placeholder="Describe what needs attention..." style={{ ...adminInput, height: '100px' }} value={reportData.desc} onChange={e => setReportData({ ...reportData, desc: e.target.value })} />

            <button className="btn-hover" disabled={isSubmitting} style={{ fontFamily: "'Inter', sans-serif", border: 'none', padding: '12px 22px', borderRadius: '10px', width: '100%', background: '#5d6f41', color: '#fff', fontWeight: 'bold' }} onClick={handleSubmitReport}>{isSubmitting ? "Uploading..." : "Submit Report"}</button>
            <button style={{ background: 'none', border: 'none', color: 'gray', width: '100%', marginTop: '10px', cursor: 'pointer' }} onClick={() => setShowReportForm(false)}>Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;