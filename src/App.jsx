import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mail, Upload, Send, X, CheckCircle, AlertCircle, Play, Square, Loader2, Settings, Paperclip } from 'lucide-react';
import logoSrc from './assets/edulogo.png';

const API_BASE = 'http://localhost:5000/api';

const RichEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const [showHtml, setShowHtml] = useState(false);

  // Replace CID with local URL for rendering, and vice-versa for saving
  const displayValue = value ? value.replace(/src="cid:edusionlogo"/g, `src="${logoSrc}"`) : '';

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== displayValue) {
      editorRef.current.innerHTML = displayValue;
    }
  }, []);

  useEffect(() => {
    if (!showHtml && editorRef.current && editorRef.current.innerHTML !== displayValue) {
      editorRef.current.innerHTML = displayValue;
    }
  }, [showHtml, displayValue]);

  const handleInput = () => {
    if (editorRef.current) {
      // Browser prepends http://localhost to relative src in contentEditable, so we must replace the entire src attribute
      const savedContent = editorRef.current.innerHTML.replace(/src="[^"]*edulogo\.png"/g, 'src="cid:edusionlogo"');
      onChange(savedContent);
    }
  };

  const handleHtmlChange = (e) => {
    onChange(e.target.value);
  };

  const execCmd = (cmd, arg = null) => {
    if (showHtml) return;
    document.execCommand(cmd, false, arg);
    editorRef.current.focus();
    handleInput();
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: 'rgba(15,23,42,0.5)' }}>
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => execCmd('bold')} disabled={showHtml} style={{ padding: '4px 12px', background: showHtml ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.1)', color: showHtml ? '#666' : 'white', border: '1px solid var(--border)', borderRadius: '4px', cursor: showHtml ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>B</button>
          <button type="button" onClick={() => execCmd('italic')} disabled={showHtml} style={{ padding: '4px 12px', background: showHtml ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.1)', color: showHtml ? '#666' : 'white', border: '1px solid var(--border)', borderRadius: '4px', cursor: showHtml ? 'not-allowed' : 'pointer', fontStyle: 'italic' }}>I</button>
          <button type="button" onClick={() => execCmd('underline')} disabled={showHtml} style={{ padding: '4px 12px', background: showHtml ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.1)', color: showHtml ? '#666' : 'white', border: '1px solid var(--border)', borderRadius: '4px', cursor: showHtml ? 'not-allowed' : 'pointer', textDecoration: 'underline' }}>U</button>
        </div>
        <button type="button" onClick={() => setShowHtml(!showHtml)} style={{ padding: '4px 12px', background: showHtml ? 'var(--primary, #3b82f6)' : 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
          {showHtml ? 'Show Visual' : '</> HTML Code'}
        </button>
      </div>
      {showHtml ? (
        <textarea
          value={value}
          onChange={handleHtmlChange}
          placeholder="Paste your custom HTML code here..."
          style={{ width: '100%', minHeight: '200px', padding: '1rem', color: 'white', background: 'rgba(0,0,0,0.2)', border: 'none', outline: 'none', lineHeight: '1.6', fontFamily: 'monospace', resize: 'vertical' }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight: '200px', padding: '1rem', color: 'white', outline: 'none', lineHeight: '1.6' }}
        />
      )}
    </div>
  );
};

function App() {
  const [smtp, setSmtp] = useState({
    host: 'smtp.gmail.com',
    port: '465',
    user: '',
    pass: ''
  });
  
  const [campaign, setCampaign] = useState({
    subject: 'Doctorate Program Admission 2026',
    template: '<p>Dear {{name}},</p><p><br></p><p>We are pleased to inform you that your application for the Doctorate Program has been reviewed. Please find the details below.</p><p><br></p><p>Best regards,</p><p>Doctorate Committee</p>',
    file: null,
    attachments: []
  });

  const [status, setStatus] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    current: '',
    isSending: false,
    logs: []
  });

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const attachmentsInputRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    let interval;
    if (status.isSending) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE}/status`);
          setStatus(res.data);
          if (!res.data.isSending) clearInterval(interval);
        } catch (err) {
          console.error('Failed to fetch status', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status.isSending]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [status.logs]);

  const handleStart = async () => {
    if (!campaign.file || !smtp.user || !smtp.pass) {
      alert('Please fill in all SMTP details and upload a CSV file.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('csv', campaign.file);
    campaign.attachments.forEach(file => {
      formData.append('attachments', file);
    });
    formData.append('subject', campaign.subject);
    formData.append('template', campaign.template);
    formData.append('smtpHost', smtp.host);
    formData.append('smtpPort', smtp.port);
    formData.append('smtpUser', smtp.user);
    formData.append('smtpPass', smtp.pass);

    try {
      await axios.post(`${API_BASE}/send`, formData);
      setStatus(prev => ({ ...prev, isSending: true }));
    } catch (err) {
      alert('Failed to start campaign: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      await axios.post(`${API_BASE}/stop`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <div className="title-group">
          <h1>Bulk Email Pro</h1>
          <p>Doctorate Program Campaign Manager</p>
        </div>
        <div className="glass card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.isSending ? 'var(--success)' : 'var(--text-muted)' }}></div>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{status.isSending ? 'Active' : 'Idle'}</span>
        </div>
      </header>

      <div className="grid">
        {/* Left Column: Config */}
        <div className="space-y">
          <div className="glass card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} className="text-primary" />
              SMTP Configuration
            </h2>
            <div className="form-group">
              <label>SMTP Host</label>
              <input type="text" value={smtp.host} onChange={e => setSmtp({...smtp, host: e.target.value})} placeholder="e.g. smtp.gmail.com" />
            </div>
            <div className="form-group">
              <label>SMTP Port</label>
              <input type="text" value={smtp.port} onChange={e => setSmtp({...smtp, port: e.target.value})} placeholder="e.g. 465" />
            </div>
            <div className="form-group">
              <label>Username / Email</label>
              <input type="email" value={smtp.user} onChange={e => setSmtp({...smtp, user: e.target.value})} placeholder="your@email.com" />
            </div>
            <div className="form-group">
              <label>App Password</label>
              <input type="password" value={smtp.pass} onChange={e => setSmtp({...smtp, pass: e.target.value})} placeholder="••••••••••••" />
            </div>
          </div>

          <div className="glass card" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={20} className="text-primary" />
              Recipients List
            </h2>
            <div 
              className="form-group" 
              style={{ 
                border: '2px dashed var(--border)', 
                borderRadius: '8px', 
                padding: '2rem', 
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".csv"
                onChange={e => setCampaign({...campaign, file: e.target.files[0]})}
              />
              <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.875rem' }}>
                {campaign.file ? campaign.file.name : 'Click to upload CSV file'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Columns should include: <b>name</b>, <b>email</b>
              </p>
            </div>
          </div>

          <div className="glass card" style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Paperclip size={20} className="text-primary" />
              Attachments
            </h2>
            <div 
              className="form-group" 
              style={{ 
                border: '2px dashed var(--border)', 
                borderRadius: '8px', 
                padding: '2rem', 
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={() => attachmentsInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={attachmentsInputRef} 
                style={{ display: 'none' }} 
                multiple
                onChange={e => setCampaign({...campaign, attachments: Array.from(e.target.files)})}
              />
              <Paperclip size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.875rem' }}>
                {campaign.attachments?.length > 0 ? `${campaign.attachments.length} files selected` : 'Click to select attachments (PDFs, images, etc.)'}
              </p>
              {campaign.attachments?.length > 0 && (
                <div style={{ marginTop: '1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', maxHeight: '100px', overflowY: 'auto' }}>
                  {campaign.attachments.map((file, i) => (
                    <div key={i} style={{ padding: '4px 0' }}>📄 {file.name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Template & Progress */}
        <div className="space-y">
          <div className="glass card">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} className="text-primary" />
              Email Template
            </h2>
            <div className="form-group">
              <label>Subject Line</label>
              <input 
                type="text" 
                value={campaign.subject} 
                onChange={e => setCampaign({...campaign, subject: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Message (Use {'{{name}}'} and {'{{email}}'} for personalization)</label>
              <RichEditor 
                value={campaign.template} 
                onChange={content => setCampaign({...campaign, template: content})}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {!status.isSending ? (
                <button className="btn btn-primary" onClick={handleStart} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : <Play size={18} />}
                  Start Campaign
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ color: 'var(--error)' }} onClick={handleStop}>
                  <Square size={18} />
                  Stop Campaign
                </button>
              )}
            </div>
          </div>

          {status.total > 0 && (
            <div className="glass card" style={{ marginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Campaign Progress</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{status.current}</p>
              
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${(status.sent + status.failed) / status.total * 100}%` }}
                ></div>
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{status.total}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value" style={{ color: 'var(--success)' }}>{status.sent}</span>
                  <span className="stat-label">Sent</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value" style={{ color: 'var(--error)' }}>{status.failed}</span>
                  <span className="stat-label">Failed</span>
                </div>
              </div>

              <div className="logs">
                {status.logs.map((log, i) => (
                  <div key={i} className={`log-entry ${log.startsWith('Success') ? 'log-success' : 'log-error'}`}>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
