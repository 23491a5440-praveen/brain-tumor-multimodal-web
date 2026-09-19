import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Activity, BrainCircuit, X, Image as ImageIcon, ChevronRight, Settings, Layers, GitMerge, CheckCircle, Network, Info, Target, Cpu, AlertTriangle, ChevronDown } from 'lucide-react';
import './index.css';

function App() {
  const [ctImage, setCtImage] = useState(null);
  const [mriImage, setMriImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDraggingCT, setIsDraggingCT] = useState(false);
  const [isDraggingMRI, setIsDraggingMRI] = useState(false);

  const ctInputRef = useRef(null);
  const mriInputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      const sections = ['home', 'how-it-works', 'about'];
      let current = 'home';
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            current = section;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDragOver = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'ct') setIsDraggingCT(true);
    if (type === 'mri') setIsDraggingMRI(true);
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'ct') setIsDraggingCT(false);
    if (type === 'mri') setIsDraggingMRI(false);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'ct') setIsDraggingCT(false);
    if (type === 'mri') setIsDraggingMRI(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (eLoad) => {
          if (type === 'ct') setCtImage({ url: eLoad.target.result, name: file.name, file: file });
          if (type === 'mri') setMriImage({ url: eLoad.target.result, name: file.name, file: file });
          setResults(null);
          setErrorMsg('');
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'ct') setCtImage({ url: e.target.result, name: file.name, file: file });
        if (type === 'mri') setMriImage({ url: e.target.result, name: file.name, file: file });
        
        // Reset results when new images are uploaded
        setResults(null);
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e, type) => {
    e.stopPropagation();
    if (type === 'ct') {
      setCtImage(null);
      if (ctInputRef.current) ctInputRef.current.value = '';
    }
    if (type === 'mri') {
      setMriImage(null);
      if (mriInputRef.current) mriInputRef.current.value = '';
    }
    setResults(null);
    setErrorMsg('');
  };

  const handleAnalyze = async () => {
    setErrorMsg('');
    
    // Frontend Validation
    if (!ctImage && !mriImage) {
      setErrorMsg('Please upload both a CT scan and an MRI scan.');
      return;
    }
    if (!ctImage) {
      setErrorMsg('Please upload a CT scan.');
      return;
    }
    if (!mriImage) {
      setErrorMsg('Please upload an MRI scan.');
      return;
    }
    
    setIsAnalyzing(true);
    const startTime = performance.now();
    
    try {
      const formData = new FormData();
      formData.append('ct_image', ctImage.file);
      formData.append('mri_image', mriImage.file);
      
      const response = await fetch('https://brain-tumor-backend-6kvr.onrender.com/predict', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Analysis service is unavailable. Please try again.');
      }
      
      const data = await response.json();
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);
      
      setResults({
        backendData: data,
        latency: latencyMs
      });
    } catch (err) {
      setErrorMsg('Analysis service is unavailable. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container">
      {/* Small Progress Navigation (Fixed) */}
      <div className={`progress-nav ${isScrolled ? 'visible' : ''}`}>
        <div className="progress-container">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`progress-item ${activeSection === 'home' ? 'active' : ''}`}>
            <span className="progress-dot"></span>
            <span className="progress-label">Home</span>
          </a>
          <div className="progress-line"></div>
          <a href="#how-it-works" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' }); }} className={`progress-item ${activeSection === 'how-it-works' ? 'active' : ''}`}>
            <span className="progress-dot"></span>
            <span className="progress-label">How It Works</span>
          </a>
          <div className="progress-line"></div>
          <a href="#about" onClick={(e) => { e.preventDefault(); document.getElementById('about').scrollIntoView({ behavior: 'smooth' }); }} className={`progress-item ${activeSection === 'about' ? 'active' : ''}`}>
            <span className="progress-dot"></span>
            <span className="progress-label">About</span>
          </a>
        </div>
      </div>

      <header className="header">
        <div className="logo-section">
          <div className="header-icon">
            <BrainCircuit size={32} />
          </div>
          <div>
            <h1 className="title-gradient">NeuroScan AI</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Multimodal Brain Tumor Analysis
            </p>
          </div>
        </div>

        <nav className="main-nav">
          <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); }} className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}>Home</a>
          <a href="#how-it-works" className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}>How It Works</a>
          <a href="#about" className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}>About</a>
        </nav>
      </header>

      <main id="home" className="main-content">
        {/* Left Column: Inputs */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>

          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Upload Your Brain Scans
            </h2>
          </div>

          <div className="upload-steps">
            <span className={`step-badge ${ctImage ? 'completed' : 'active'}`}>01 CT Scan</span>
            <ChevronRight size={18} className="step-arrow" />
            <span className={`step-badge ${(ctImage && !mriImage) ? 'active' : (mriImage ? 'completed' : '')}`}>02 MRI Scan</span>
            <ChevronRight size={18} className="step-arrow" />
            <span className={`step-badge ${(ctImage && mriImage && !isAnalyzing && !results) ? 'active' : (results ? 'completed' : '')}`}>03 Analyze</span>
          </div>
          
          <div className="upload-grid">
            {/* CT Scan Upload */}
            <div 
              className={`upload-box ${ctImage ? 'active' : ''} ${isDraggingCT ? 'dragging' : ''}`} 
              onClick={() => ctInputRef.current?.click()}
              onDragOver={(e) => handleDragOver(e, 'ct')}
              onDragLeave={(e) => handleDragLeave(e, 'ct')}
              onDrop={(e) => handleDrop(e, 'ct')}
              style={isDraggingCT ? { borderColor: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)' } : {}}
            >
              {isDraggingCT ? (
                <>
                  <UploadCloud className="upload-icon" size={48} color="var(--accent-cyan)" />
                  <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: 'var(--accent-cyan)' }}>Drop CT image here</h3>
                </>
              ) : ctImage ? (
                <>
                  <img src={ctImage.url} alt="CT Scan Preview" className="preview-image" />
                  <div className="preview-overlay" style={{ flexDirection: 'column', gap: '1rem' }}>
                    <button className="remove-btn" onClick={(e) => handleRemoveImage(e, 'ct')}>
                      <X size={18} /> Remove CT
                    </button>
                    <div style={{ background: 'rgba(0,0,0,0.7)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.85rem', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 3 }}>
                      {ctImage.name}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="upload-icon" size={40} />
                  <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>CT Scan</h3>
                  <p>Click or drag image to upload</p>
                </>
              )}
              <input 
                type="file" 
                ref={ctInputRef}
                className="file-input" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'ct')}
              />
            </div>

            {/* MRI Scan Upload */}
            <div 
              className={`upload-box ${mriImage ? 'active' : ''} ${isDraggingMRI ? 'dragging' : ''}`} 
              onClick={() => mriInputRef.current?.click()}
              onDragOver={(e) => handleDragOver(e, 'mri')}
              onDragLeave={(e) => handleDragLeave(e, 'mri')}
              onDrop={(e) => handleDrop(e, 'mri')}
              style={isDraggingMRI ? { borderColor: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)' } : {}}
            >
              {isDraggingMRI ? (
                <>
                  <ImageIcon className="upload-icon" size={48} color="var(--accent-cyan)" />
                  <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: 'var(--accent-cyan)' }}>Drop MRI image here</h3>
                </>
              ) : mriImage ? (
                <>
                  <img src={mriImage.url} alt="MRI Scan Preview" className="preview-image" />
                  <div className="preview-overlay" style={{ flexDirection: 'column', gap: '1rem' }}>
                    <button className="remove-btn" onClick={(e) => handleRemoveImage(e, 'mri')}>
                      <X size={18} /> Remove MRI
                    </button>
                    <div style={{ background: 'rgba(0,0,0,0.7)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.85rem', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 3 }}>
                      {mriImage.name}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="upload-icon" size={40} />
                  <h3 style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>MRI Scan</h3>
                  <p>Click or drag image to upload</p>
                </>
              )}
              <input 
                type="file" 
                ref={mriInputRef}
                className="file-input" 
                accept="image/*" 
                onChange={(e) => handleImageUpload(e, 'mri')}
              />
            </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <div className="loader"></div>
                Analyzing CT + MRI scans...
              </>
            ) : (
              <>
                Analyze Images
                <ChevronRight size={20} />
              </>
            )}
          </button>
          
          {errorMsg && (
            <div style={{ color: 'var(--error-color)', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="glass-card results-container" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ImageIcon size={24} color="var(--accent-teal)" />
            Analysis Results
          </h2>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
            {isAnalyzing ? (
              <div className="loader" style={{ width: '48px', height: '48px', borderWidth: '4px', borderColor: 'rgba(6, 182, 212, 0.2)', borderTopColor: 'var(--accent-cyan)' }}></div>
            ) : results && results.backendData ? (
              <div style={{ textAlign: 'left', width: '100%', animation: 'fadeIn 0.5s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <Activity size={28} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>
                    Clinical Analysis Report
                  </h3>
                </div>
                
                <div style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                  {results.backendData.prediction === 'Healthy' ? (
                    <div style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--success-color)', paddingLeft: '1rem' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', letterSpacing: '0.1em', margin: '0 0 0.25rem', fontWeight: 600 }}>NEGATIVE FOR MASS / LESION</p>
                      <h2 style={{ color: 'var(--success-color)', margin: '0', fontSize: '1.75rem', fontWeight: 700 }}>Normal / Non-Tumor</h2>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--error-color)', paddingLeft: '1rem' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', letterSpacing: '0.1em', margin: '0 0 0.25rem', fontWeight: 600 }}>POSITIVE FOR MASS / LESION</p>
                      <h2 style={{ color: 'var(--error-color)', margin: '0', fontSize: '1.75rem', fontWeight: 700 }}>Tumor Detected</h2>
                    </div>
                  )}

                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                      <div>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence Score</p>
                        <p style={{ color: results.backendData.confidence >= 90 ? 'var(--success-color)' : (results.backendData.confidence >= 70 ? 'var(--accent-cyan)' : 'var(--error-color)'), margin: '0.25rem 0 0', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                          AI Confidence Level: {results.backendData.confidence >= 90 ? 'High' : (results.backendData.confidence >= 70 ? 'Medium' : 'Low')}
                        </p>
                      </div>
                      <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.25rem' }}>
                        {results.backendData.confidence}%
                      </h3>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${results.backendData.confidence}%`, 
                        background: results.backendData.prediction === 'Healthy' ? 'var(--success-color)' : 'var(--error-color)',
                        borderRadius: '4px',
                        transition: 'width 1s ease-in-out'
                      }}></div>
                    </div>
                  </div>

                  {results.latency && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edge Latency</p>
                      <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{results.latency} ms</p>
                    </div>
                  )}

                  {results.backendData.explanation && (
                    <>
                      <p style={{ color: 'var(--text-secondary)', margin: '0 0 0.35rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Explanation</p>
                      <p style={{ color: 'var(--text-primary)', margin: '0 0 1.25rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        {results.backendData.explanation}
                      </p>
                    </>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <AlertTriangle size={18} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>
                      AI-assisted result for research and educational purposes only. This is not a medical diagnosis.
                    </p>
                  </div>
                </div>

                {/* Grad-CAM Section */}
                {(results.backendData.ct_heatmap || results.backendData.mri_heatmap) && (
                  <div style={{ marginTop: '1.5rem', animation: 'fadeIn 0.8s ease' }}>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={18} color="var(--accent-cyan)" />
                      Visual Explanations
                    </h4>
                    
                    <div style={{ display: 'flex', gap: '1rem', flexDirection: 'row', flexWrap: 'wrap' }}>
                      {results.backendData.ct_heatmap && (
                        <div style={{ flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.5rem', textAlign: 'center' }}>CT Grad-CAM</p>
                          <img src={results.backendData.ct_heatmap} alt="CT Grad-CAM" style={{ width: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                        </div>
                      )}
                      
                      {results.backendData.mri_heatmap && (
                        <div style={{ flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.5rem', textAlign: 'center' }}>MRI Grad-CAM</p>
                          <img src={results.backendData.mri_heatmap} alt="MRI Grad-CAM" style={{ width: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>
                    
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', fontSize: '0.8rem', textAlign: 'center', fontStyle: 'italic' }}>
                      AI attention visualization — research/educational use only.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <BrainCircuit size={48} color="var(--text-secondary)" style={{ opacity: 0.15 }} />
            )}
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section id="how-it-works" className="workflow-section">
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <h2 className="workflow-section-title title-gradient">AI Architecture Pipeline</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Our deep learning engine utilizes parallel feature extraction and late fusion to maximize diagnostic accuracy across multiple imaging modalities.
          </p>
        </div>

        <div className="pipeline-wrapper">
          
          {/* Stage 1: Inputs */}
          <div className="pipeline-split">
            <div className="pipeline-node node-ct">
              <div className="node-label">Stage 1</div>
              <div className="pipeline-icon-wrapper"><ImageIcon size={24} /></div>
              <h4>CT Scan Input</h4>
              <p>Bone density & structure</p>
            </div>
            <div className="pipeline-node node-mri">
              <div className="node-label">Stage 1</div>
              <div className="pipeline-icon-wrapper"><ImageIcon size={24} /></div>
              <h4>MRI Scan Input</h4>
              <p>Soft tissue boundaries</p>
            </div>
          </div>

          {/* Parallel Down Arrows */}
          <div className="pipeline-split">
            <div className="parallel-arrow"><div className="flow-line"></div></div>
            <div className="parallel-arrow"><div className="flow-line"></div></div>
          </div>

          {/* Stage 2: Preprocessing */}
          <div className="pipeline-split">
            <div className="pipeline-node node-ct">
              <div className="node-label">Stage 2</div>
              <div className="pipeline-icon-wrapper"><Settings size={24} /></div>
              <h4>Preprocessing</h4>
              <p>224×224, normalization, denoising</p>
            </div>
            <div className="pipeline-node node-mri">
              <div className="node-label">Stage 2</div>
              <div className="pipeline-icon-wrapper"><Settings size={24} /></div>
              <h4>Preprocessing</h4>
              <p>224×224, normalization, denoising</p>
            </div>
          </div>

          {/* Parallel Down Arrows */}
          <div className="pipeline-split">
            <div className="parallel-arrow"><div className="flow-line"></div></div>
            <div className="parallel-arrow"><div className="flow-line"></div></div>
          </div>

          {/* Stage 3: EfficientNet-B0 */}
          <div className="pipeline-split">
            <div className="pipeline-node node-ct">
              <div className="node-label">Stage 3</div>
              <div className="pipeline-icon-wrapper"><Layers size={24} /></div>
              <h4>CT EfficientNet-B0</h4>
              <p>CNN feature branch</p>
            </div>
            <div className="pipeline-node node-mri">
              <div className="node-label">Stage 3</div>
              <div className="pipeline-icon-wrapper"><Layers size={24} /></div>
              <h4>MRI EfficientNet-B0</h4>
              <p>CNN feature branch</p>
            </div>
          </div>

          {/* Parallel Down Arrows */}
          <div className="pipeline-split">
            <div className="parallel-arrow"><div className="flow-line"></div></div>
            <div className="parallel-arrow"><div className="flow-line"></div></div>
          </div>

          {/* Stage 4: Global Average Pooling */}
          <div className="pipeline-split">
            <div className="pipeline-node node-ct">
              <div className="node-label">Stage 4</div>
              <div className="pipeline-icon-wrapper"><Network size={24} /></div>
              <h4>Global Average Pooling</h4>
              <p>Spatial dimension reduction</p>
            </div>
            <div className="pipeline-node node-mri">
              <div className="node-label">Stage 4</div>
              <div className="pipeline-icon-wrapper"><Network size={24} /></div>
              <h4>Global Average Pooling</h4>
              <p>Spatial dimension reduction</p>
            </div>
          </div>

          {/* Parallel Down Arrows */}
          <div className="pipeline-split">
            <div className="parallel-arrow"><div className="flow-line"></div></div>
            <div className="parallel-arrow"><div className="flow-line"></div></div>
          </div>

          {/* Stage 5: Feature Vectors */}
          <div className="pipeline-split">
            <div className="pipeline-node node-ct">
              <div className="node-label">Stage 5</div>
              <div className="pipeline-icon-wrapper"><BrainCircuit size={24} /></div>
              <h4>CT Feature Vector</h4>
              <p>1D numerical representation</p>
            </div>
            <div className="pipeline-node node-mri">
              <div className="node-label">Stage 5</div>
              <div className="pipeline-icon-wrapper"><BrainCircuit size={24} /></div>
              <h4>MRI Feature Vector</h4>
              <p>1D numerical representation</p>
            </div>
          </div>

          {/* Merge Connector */}
          <div className="merge-connector">
             <div className="merge-arrow"><div className="flow-line" style={{ height: '20px' }}></div></div>
          </div>

          {/* Stage 6: Late Fusion */}
          <div className="pipeline-centered" style={{ marginTop: '20px' }}>
            <div className="pipeline-node node-fusion">
              <div className="node-label" style={{ background: 'var(--accent-teal)', color: '#000' }}>Stage 6</div>
              <div className="pipeline-icon-wrapper" style={{ color: 'var(--accent-teal)' }}><GitMerge size={24} /></div>
              <h4>Late Fusion</h4>
              <p>Feature concatenation</p>
            </div>
          </div>

          {/* Down Arrow */}
          <div className="pipeline-centered">
            <div className="single-arrow"><div className="flow-line"></div></div>
          </div>

          {/* Stage 7: Fused Feature Vector */}
          <div className="pipeline-centered">
            <div className="pipeline-node node-fusion">
              <div className="node-label" style={{ background: 'var(--accent-teal)', color: '#000' }}>Stage 7</div>
              <div className="pipeline-icon-wrapper" style={{ color: 'var(--accent-teal)' }}><Network size={24} /></div>
              <h4>Fused Feature Vector</h4>
              <p>Combined spatial data</p>
            </div>
          </div>

          {/* Down Arrow */}
          <div className="pipeline-centered">
            <div className="single-arrow"><div className="flow-line"></div></div>
          </div>

          {/* Stage 8: MLP Classifier */}
          <div className="pipeline-centered">
            <div className="pipeline-node">
              <div className="node-label">Stage 8</div>
              <div className="pipeline-icon-wrapper"><Activity size={24} /></div>
              <h4>MLP Classification</h4>
              <p>Multi-Layer Perceptron</p>
            </div>
          </div>

          {/* Down Arrow */}
          <div className="pipeline-centered">
            <div className="single-arrow"><div className="flow-line"></div></div>
          </div>

          {/* Stage 9: Output */}
          <div className="pipeline-centered">
            <div className="pipeline-node" style={{ borderColor: 'var(--success-color)' }}>
              <div className="node-label" style={{ background: 'var(--success-color)', color: '#fff', borderColor: 'var(--success-color)' }}>Stage 9</div>
              <div className="pipeline-icon-wrapper" style={{ color: 'var(--success-color)' }}><CheckCircle size={24} /></div>
              <h4>Prediction Output</h4>
              <p>Tumor classification</p>
            </div>
          </div>

        </div>
      </section>

      {/* About Section */}
      <section id="about" className="workflow-section" style={{ marginBottom: '6rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 className="workflow-section-title title-gradient" style={{ fontSize: '2rem' }}>Multi-Modal Brain Tumor Classification</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 500, marginTop: '0.5rem' }}>
            Using Late Fusion Networks
          </p>
        </div>

        <div className="about-grid">
          <div className="about-card">
            <div className="about-icon"><Info size={28} /></div>
            <h3>Project Overview</h3>
            <p>A final-year medical AI research project demonstrating how combining multiple imaging modalities can provide a more comprehensive analysis of brain tumors than a single scan alone.</p>
          </div>

          <div className="about-card">
            <div className="about-icon"><Layers size={28} /></div>
            <h3>CT & MRI Modalities</h3>
            <p>We leverage both Computed Tomography (CT) for capturing dense structural data and Magnetic Resonance Imaging (MRI) for highly detailed soft tissue boundaries, giving the AI a complete spatial view.</p>
          </div>

          <div className="about-card">
            <div className="about-icon"><Network size={28} /></div>
            <h3>Deep Learning Core</h3>
            <p>The system runs the scans through parallel <strong>EfficientNet-B0</strong> feature extractors, merges the data via <strong>Late Fusion</strong>, and classifies the tumor using a <strong>Multi-Layer Perceptron (MLP)</strong>.</p>
          </div>
        </div>

        <div className="notice-card">
          <div className="notice-icon"><AlertTriangle size={32} /></div>
          <div>
            <h3>Research & Educational Prototype</h3>
            <p>This application is developed strictly for academic, research, and educational purposes as a final-year project prototype. It is not an FDA-approved medical device, does not provide real clinical diagnoses, and should never be used as a substitute for professional medical care.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
