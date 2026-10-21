import { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Activity, 
  BrainCircuit, 
  X, 
  Image as ImageIcon, 
  ChevronRight, 
  Settings, 
  Layers, 
  GitMerge, 
  CheckCircle, 
  Network, 
  Info, 
  Cpu, 
  AlertTriangle, 
  RotateCcw, 
  Copy, 
  Check, 
  ShieldAlert, 
  Zap, 
  FileText 
} from 'lucide-react';
import './index.css';

// Configurable API base URL with safe Render URL fallback
const FALLBACK_API_URL = 'https://brain-tumor-backend-6kvr.onrender.com';
const RAW_API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = (RAW_API_URL && RAW_API_URL.trim() !== '')
  ? RAW_API_URL.trim().replace(/\/+$/, '')
  : FALLBACK_API_URL;

function App() {
  const [ctImage, setCtImage] = useState(null);
  const [mriImage, setMriImage] = useState(null);
  const [modelVariant, setModelVariant] = useState('production'); // 'production' (default) | 'experimental'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
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

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processUploadedFile = (file, type) => {
    if (!file) return;
    setResults(null);
    setErrorMsg('');

    if (file.type && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (eLoad) => {
        const imgData = {
          url: eLoad.target.result,
          name: file.name,
          size: file.size,
          type: file.type,
          file: file
        };
        if (type === 'ct') setCtImage(imgData);
        if (type === 'mri') setMriImage(imgData);
      };
      reader.onerror = () => {
        const rawData = {
          url: null,
          name: file.name,
          size: file.size,
          type: file.type || 'image',
          file: file
        };
        if (type === 'ct') setCtImage(rawData);
        if (type === 'mri') setMriImage(rawData);
      };
      reader.readAsDataURL(file);
    } else {
      // Store non-image / raw file so backend API validation can inspect it directly
      const rawData = {
        url: null,
        name: file.name,
        size: file.size,
        type: file.type || 'unknown',
        file: file
      };
      if (type === 'ct') setCtImage(rawData);
      if (type === 'mri') setMriImage(rawData);
    }
  };

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
      processUploadedFile(e.dataTransfer.files[0], type);
    }
  };

  const handleImageUpload = (e, type) => {
    if (e.target.files && e.target.files.length > 0) {
      processUploadedFile(e.target.files[0], type);
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

  const handleResetAll = () => {
    setCtImage(null);
    setMriImage(null);
    setResults(null);
    setErrorMsg('');
    if (ctInputRef.current) ctInputRef.current.value = '';
    if (mriInputRef.current) mriInputRef.current.value = '';
  };

  const handleCopyReport = () => {
    if (!results || !results.backendData) return;
    const reportText = `NEUROSCAN AI - MULTIMODAL CLINICAL RESEARCH SUMMARY
--------------------------------------------------
Classification: ${results.backendData.prediction} (${results.backendData.prediction === 'Healthy' ? 'Negative for lesion' : 'Mass / lesion detected'})
Model Confidence: ${results.backendData.confidence}% (Softmax activation score)
Model Architecture: ${results.variantUsed === 'experimental' ? 'Experimental Fine-Tuned' : 'Production Baseline (Default)'}
Edge Inference Latency: ${results.latency || 'N/A'} ms
Timestamp: ${results.timestamp || new Date().toLocaleString()}
Notice: Prototype generated strictly for academic and educational research. Not a certified clinical diagnosis.`;

    navigator.clipboard.writeText(reportText).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    });
  };

  const handleAnalyze = async () => {
    setErrorMsg('');

    // Pre-flight frontend validation
    if (!ctImage && !mriImage) {
      setErrorMsg('Please upload both a CT scan and an MRI scan before starting analysis.');
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

      // Safe model variant selector: default production sends standard request;
      // experimental fine-tuned sends X-Model-Variant: experimental
      const headers = {};
      if (modelVariant === 'experimental') {
        headers['X-Model-Variant'] = 'experimental';
      }

      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        let serverError = '';
        try {
          const errorJson = await response.json();
          if (errorJson && errorJson.detail) {
            serverError = typeof errorJson.detail === 'string'
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
          } else if (errorJson && errorJson.message) {
            serverError = errorJson.message;
          }
        } catch {
          try {
            serverError = await response.text();
          } catch {
            serverError = '';
          }
        }

        if (!serverError || serverError.trim() === '') {
          serverError = `Analysis failed with HTTP status ${response.status} (${response.statusText || 'Server Error'}).`;
        }
        throw new Error(serverError);
      }

      const data = await response.json();
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      setResults({
        backendData: data,
        latency: latencyMs,
        variantUsed: data.model_variant || (modelVariant === 'experimental' ? 'experimental' : 'production'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    } catch (err) {
      console.error('Inference error:', err);
      setErrorMsg(err.message || 'Analysis service is unavailable. Please verify backend connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sticky Progress Navigation */}
      <div className={`progress-nav ${isScrolled ? 'visible' : ''}`}>
        <div className="progress-container">
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className={`progress-item ${activeSection === 'home' ? 'active' : ''}`}
          >
            <span className="progress-dot"></span>
            <span className="progress-label">Analysis</span>
          </a>
          <div className="progress-line"></div>
          <a 
            href="#how-it-works" 
            onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }} 
            className={`progress-item ${activeSection === 'how-it-works' ? 'active' : ''}`}
          >
            <span className="progress-dot"></span>
            <span className="progress-label">Architecture</span>
          </a>
          <div className="progress-line"></div>
          <a 
            href="#about" 
            onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} 
            className={`progress-item ${activeSection === 'about' ? 'active' : ''}`}
          >
            <span className="progress-dot"></span>
            <span className="progress-label">Research Info</span>
          </a>
        </div>
      </div>

      {/* Header */}
      <header className="header">
        <div className="logo-section">
          <div className="header-icon">
            <BrainCircuit size={32} />
          </div>
          <div>
            <h1 className="title-gradient">NeuroScan AI</h1>
            <p className="header-subtitle">
              Multimodal Brain Tumor Analysis • Dual EfficientNet-B0 Late Fusion
            </p>
          </div>
        </div>

        <nav className="main-nav">
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
            className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}
          >
            Analysis Console
          </a>
          <a 
            href="#how-it-works" 
            onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }} 
            className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}
          >
            Pipeline
          </a>
          <a 
            href="#about" 
            onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }} 
            className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
          >
            Research & Ethics
          </a>
        </nav>
      </header>

      {/* Main Workspace */}
      <main id="home" className="main-content">
        {/* Left Column: Input Scans & Configuration */}
        <div className="glass-card left-panel-card">
          <div className="section-intro">
            <h2>Multimodal Scan Input</h2>
            <p>Upload paired Computed Tomography (CT) and Magnetic Resonance (MRI) cross-sections.</p>
          </div>

          <div className="upload-steps">
            <span className={`step-badge ${ctImage ? 'completed' : 'active'}`}>01 CT Scan</span>
            <ChevronRight size={18} className="step-arrow" />
            <span className={`step-badge ${(ctImage && !mriImage) ? 'active' : (mriImage ? 'completed' : '')}`}>02 MRI Scan</span>
            <ChevronRight size={18} className="step-arrow" />
            <span className={`step-badge ${(ctImage && mriImage && !isAnalyzing && !results) ? 'active' : (results ? 'completed' : '')}`}>03 Fusion</span>
          </div>

          <div className="upload-grid">
            {/* CT Scan Upload */}
            <div 
              className={`upload-box ${ctImage ? 'active' : ''} ${isDraggingCT ? 'dragging' : ''}`} 
              onClick={() => ctInputRef.current?.click()}
              onDragOver={(e) => handleDragOver(e, 'ct')}
              onDragLeave={(e) => handleDragLeave(e, 'ct')}
              onDrop={(e) => handleDrop(e, 'ct')}
            >
              {isDraggingCT ? (
                <div className="drop-active-state">
                  <UploadCloud className="upload-icon bounce-anim" size={44} />
                  <h3 className="drop-target-text">Drop CT Image Here</h3>
                </div>
              ) : ctImage ? (
                <>
                  {ctImage.url ? (
                    <img src={ctImage.url} alt="CT Scan Preview" className="preview-image" />
                  ) : (
                    <div className="raw-file-preview">
                      <FileText size={48} color="var(--accent-cyan)" />
                      <span className="raw-file-tag">Raw / File Upload</span>
                    </div>
                  )}
                  <div className="preview-overlay">
                    <div className="file-info-badge">
                      <span className="file-name-text">{ctImage.name}</span>
                      {ctImage.size !== undefined && (
                        <span className="file-size-text">{formatFileSize(ctImage.size)}</span>
                      )}
                    </div>
                    <div className="preview-actions">
                      <button 
                        type="button" 
                        className="remove-btn" 
                        onClick={(e) => handleRemoveImage(e, 'ct')}
                      >
                        <X size={15} /> Remove
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="upload-empty-state">
                  <div className="icon-pulse-wrapper">
                    <UploadCloud className="upload-icon" size={38} />
                  </div>
                  <h3>Computed Tomography</h3>
                  <p>Bone density & structural geometry</p>
                  <span className="upload-cta-tag">Click or drag scan</span>
                </div>
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
            >
              {isDraggingMRI ? (
                <div className="drop-active-state">
                  <ImageIcon className="upload-icon bounce-anim" size={44} />
                  <h3 className="drop-target-text">Drop MRI Image Here</h3>
                </div>
              ) : mriImage ? (
                <>
                  {mriImage.url ? (
                    <img src={mriImage.url} alt="MRI Scan Preview" className="preview-image" />
                  ) : (
                    <div className="raw-file-preview">
                      <FileText size={48} color="var(--accent-teal)" />
                      <span className="raw-file-tag">Raw / File Upload</span>
                    </div>
                  )}
                  <div className="preview-overlay">
                    <div className="file-info-badge">
                      <span className="file-name-text">{mriImage.name}</span>
                      {mriImage.size !== undefined && (
                        <span className="file-size-text">{formatFileSize(mriImage.size)}</span>
                      )}
                    </div>
                    <div className="preview-actions">
                      <button 
                        type="button" 
                        className="remove-btn" 
                        onClick={(e) => handleRemoveImage(e, 'mri')}
                      >
                        <X size={15} /> Remove
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="upload-empty-state">
                  <div className="icon-pulse-wrapper">
                    <ImageIcon className="upload-icon" size={38} />
                  </div>
                  <h3>Magnetic Resonance</h3>
                  <p>Soft tissue boundaries & parenchymal contrast</p>
                  <span className="upload-cta-tag">Click or drag scan</span>
                </div>
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

          {/* Model Architecture Selector */}
          <div className="model-selector-container">
            <div className="model-selector-header">
              <div className="model-selector-title">
                <Cpu size={16} />
                <span>Model Architecture Variant</span>
              </div>
              <span className={`model-status-chip ${modelVariant === 'production' ? 'prod' : 'exp'}`}>
                {modelVariant === 'production' ? 'Production Standard' : 'Experimental Mode'}
              </span>
            </div>

            <div className="model-toggle-group" role="radiogroup" aria-label="Neural Model Variant">
              <button
                type="button"
                role="radio"
                aria-checked={modelVariant === 'production'}
                className={`model-option-btn ${modelVariant === 'production' ? 'active' : ''}`}
                onClick={() => setModelVariant('production')}
              >
                <div className="option-radio-dot"></div>
                <div className="option-text-group">
                  <div className="option-title-row">
                    <span className="option-name">Production</span>
                    <span className="option-badge default-badge">Default</span>
                  </div>
                  <p className="option-desc">Dual EfficientNet-B0 baseline with late feature fusion (recommended).</p>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={modelVariant === 'experimental'}
                className={`model-option-btn ${modelVariant === 'experimental' ? 'active' : ''}`}
                onClick={() => setModelVariant('experimental')}
              >
                <div className="option-radio-dot"></div>
                <div className="option-text-group">
                  <div className="option-title-row">
                    <span className="option-name">Experimental</span>
                    <span className="option-badge exp-badge">Fine-Tuned</span>
                  </div>
                  <p className="option-desc">Evaluates fine-tuned weights for testing and research comparisons.</p>
                </div>
              </button>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="action-row">
            <button 
              className="btn-primary" 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <div className="loader"></div>
                  <span>Running Multimodal Late Fusion...</span>
                </>
              ) : (
                <>
                  <span>Analyze Dual Scans</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* Backend / Client Error Alert */}
          {errorMsg && (
            <div className="error-alert-card" role="alert">
              <div className="error-alert-header">
                <AlertTriangle size={18} className="error-alert-icon" />
                <span className="error-alert-title">Inference / Upload Notice</span>
                <button 
                  type="button" 
                  className="error-dismiss-btn" 
                  onClick={() => setErrorMsg('')}
                  title="Dismiss error"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="error-alert-body">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Right Column: Results & Clinical Explanation */}
        <div className="glass-card results-container">
          <div className="results-header-bar">
            <div className="results-title-group">
              <Activity size={22} color="var(--accent-cyan)" />
              <h2>Inference Dashboard</h2>
            </div>
            {results && (
              <div className="results-header-actions">
                <button 
                  type="button" 
                  className="report-action-btn" 
                  onClick={handleCopyReport}
                  title="Copy formatted summary to clipboard"
                >
                  {copiedReport ? <Check size={14} color="var(--success-color)" /> : <Copy size={14} />}
                  <span>{copiedReport ? 'Copied' : 'Copy'}</span>
                </button>
                <button 
                  type="button" 
                  className="report-action-btn reset" 
                  onClick={handleResetAll}
                  title="Reset scans and start over"
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>

          <div className="results-display-area">
            {isAnalyzing ? (
              <div className="analyzing-state">
                <div className="loader-pulse-ring">
                  <div className="loader" style={{ width: '48px', height: '48px', borderWidth: '4px' }}></div>
                </div>
                <h3 className="analyzing-title">Extracting Latent Representations</h3>
                <p className="analyzing-subtitle">
                  Computing parallel EfficientNet-B0 convolutions, applying global average pooling, and fusing features through the classification head...
                </p>
              </div>
            ) : results && results.backendData ? (
              <div className="results-content-wrapper">
                {/* Primary Outcome Card */}
                <div className={`diagnosis-banner ${results.backendData.prediction === 'Healthy' ? 'banner-healthy' : 'banner-tumor'}`}>
                  <div className="banner-left">
                    <span className="banner-eyebrow">
                      {results.backendData.prediction === 'Healthy' ? 'NEGATIVE FOR MASS / LESION' : 'POSITIVE FOR MASS / LESION'}
                    </span>
                    <h3 className="banner-headline">
                      {results.backendData.prediction === 'Healthy' ? 'Normal / Non-Tumor' : 'Tumor Detected'}
                    </h3>
                  </div>
                  <div className="banner-right">
                    <span className={`confidence-tag ${results.backendData.prediction === 'Healthy' ? 'tag-healthy' : 'tag-tumor'}`}>
                      {results.backendData.confidence}% Confidence
                    </span>
                  </div>
                </div>

                {/* Confidence Meter with Responsible Explanation */}
                <div className="confidence-metric-card">
                  <div className="metric-header-row">
                    <span className="metric-label">Model Confidence</span>
                    <span className="metric-value">{results.backendData.confidence}%</span>
                  </div>
                  <div className="confidence-meter-track">
                    <div 
                      className={`confidence-meter-fill ${results.backendData.prediction === 'Healthy' ? 'fill-healthy' : 'fill-tumor'}`}
                      style={{ width: `${Math.min(Math.max(results.backendData.confidence, 4), 100)}%` }}
                    />
                  </div>
                  <div className="confidence-explanation-note">
                    <Info size={14} className="note-icon" />
                    <span>
                      Confidence score reflects the model's mathematical softmax probability based on extracted image features. It is <strong>not</strong> an assertion of clinical accuracy or a measure of disease severity.
                    </span>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="result-meta-row">
                  <div className="meta-chip">
                    <Cpu size={14} />
                    <span>Variant: <strong>{results.variantUsed === 'experimental' ? 'Experimental Fine-Tuned' : 'Production Baseline'}</strong></span>
                  </div>
                  {results.latency !== undefined && (
                    <div className="meta-chip">
                      <Zap size={14} />
                      <span>Edge Latency: <strong>{results.latency} ms</strong></span>
                    </div>
                  )}
                  {results.timestamp && (
                    <div className="meta-chip">
                      <Activity size={14} />
                      <span>Analyzed: <strong>{results.timestamp}</strong></span>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <div className="explanation-section">
                  <h4 className="section-label">Architecture Explanation</h4>
                  <p className="explanation-text">
                    {results.backendData.explanation || 'The prediction is based on learned image features extracted from the uploaded CT and MRI scans using EfficientNet-B0 and combined through late fusion. This result is not a medical diagnosis.'}
                  </p>
                </div>

                {/* Visual Heatmaps / Grad-CAM */}
                {(results.backendData.ct_heatmap || results.backendData.mri_heatmap) && (
                  <div className="heatmaps-section">
                    <h4 className="section-label">Visual Explanations (Grad-CAM)</h4>
                    <div className="heatmaps-grid">
                      {results.backendData.ct_heatmap && (
                        <div className="heatmap-card">
                          <p className="heatmap-title">CT Scan Attention</p>
                          <img src={results.backendData.ct_heatmap} alt="CT Grad-CAM Heatmap" className="heatmap-img" />
                        </div>
                      )}
                      {results.backendData.mri_heatmap && (
                        <div className="heatmap-card">
                          <p className="heatmap-title">MRI Scan Attention</p>
                          <img src={results.backendData.mri_heatmap} alt="MRI Grad-CAM Heatmap" className="heatmap-img" />
                        </div>
                      )}
                    </div>
                    <p className="heatmap-caption">
                      Heatmaps depict gradient-weighted class activation mapping (Grad-CAM) indicating spatial regions influencing the model's classification. For research exploration only.
                    </p>
                  </div>
                )}

                {/* Research Disclaimer Card */}
                <div className="clinical-disclaimer-banner">
                  <ShieldAlert size={20} className="disclaimer-icon" />
                  <div>
                    <h4>Research & Educational Prototype Only</h4>
                    <p>
                      This system is an academic machine learning prototype. It has not undergone clinical certification, FDA 510(k) clearance, or CE mark approval. Never use this application for medical diagnosis, treatment planning, or clinical triage. Always consult certified radiologists and licensed healthcare practitioners.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state-card">
                <div className="empty-state-icon-circle">
                  <BrainCircuit size={48} color="var(--accent-cyan)" />
                </div>
                <h3>Awaiting Scan Input</h3>
                <p>
                  Select paired CT and MRI cross-sections on the left, choose your model variant, and click <strong>Analyze Dual Scans</strong> to begin late-fusion inference.
                </p>
                <div className="feature-pills-row">
                  <span className="feature-pill">Dual Modality</span>
                  <span className="feature-pill">EfficientNet-B0</span>
                  <span className="feature-pill">Late Fusion</span>
                  <span className="feature-pill">Grad-CAM Ready</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* How It Works Section */}
      <section id="how-it-works" className="workflow-section">
        <div className="section-header-centered">
          <h2 className="workflow-section-title title-gradient">AI Architecture Pipeline</h2>
          <p className="workflow-section-subtitle">
            Parallel feature extraction through separate convolutional backbones, followed by late fusion concatenation and MLP classification.
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
              <p>224×224, normalization, tensor conversion</p>
            </div>
            <div className="pipeline-node node-mri">
              <div className="node-label">Stage 2</div>
              <div className="pipeline-icon-wrapper"><Settings size={24} /></div>
              <h4>Preprocessing</h4>
              <p>224×224, normalization, tensor conversion</p>
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
              <p>Concatenation of feature vectors</p>
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
              <p>Combined multimodal latent representation</p>
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
              <p>Multi-Layer Perceptron decision head</p>
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
              <p>Binary tumor classification & confidence</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="workflow-section" style={{ marginBottom: '6rem' }}>
        <div className="section-header-centered">
          <h2 className="workflow-section-title title-gradient" style={{ fontSize: '2rem' }}>Multimodal Brain Tumor Classification</h2>
          <p className="workflow-section-subtitle">
            Academic deep learning research exploring multimodal representation learning for neuro-oncology.
          </p>
        </div>

        <div className="about-grid">
          <div className="about-card">
            <div className="about-icon"><Info size={28} /></div>
            <h3>Project Overview</h3>
            <p>Demonstrating how fusing distinct imaging modalities captures complementary information that neither modality can provide alone.</p>
          </div>

          <div className="about-card">
            <div className="about-icon"><Layers size={28} /></div>
            <h3>CT & MRI Modalities</h3>
            <p>CT captures high-density cranial bone and calcification, while MRI resolves subtle soft-tissue contrast, edema, and mass margins.</p>
          </div>

          <div className="about-card">
            <div className="about-icon"><Network size={28} /></div>
            <h3>Deep Learning Core</h3>
            <p>Dual parallel <strong>EfficientNet-B0</strong> feature extraction backbones merged via <strong>Late Fusion</strong> into an MLP classifier.</p>
          </div>
        </div>

        <div className="notice-card">
          <div className="notice-icon"><AlertTriangle size={32} /></div>
          <div>
            <h3>Research & Educational Prototype Notice</h3>
            <p>
              This application is an educational prototype developed for machine learning research. It is not an FDA-cleared medical device, does not provide clinical diagnoses, and must never be used as a substitute for professional healthcare or medical radiological evaluation.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
