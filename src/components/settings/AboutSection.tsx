import './AboutSection.css';

export function AboutSection() {
  const appVersion = '0.1.0';
  const buildNumber = '2026.01.01';

  const legalLinks = [
    { title: 'Terms of Service', icon: 'document' },
    { title: 'Privacy Policy', icon: 'shield' },
    { title: 'Cookie Policy', icon: 'cookie' },
    { title: 'Data Processing Agreement', icon: 'database' },
    { title: 'Acceptable Use Policy', icon: 'check' },
  ];

  const socialLinks = [
    { 
      name: 'Twitter / X', 
      handle: '@aibi_hq',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: '#000'
    },
    { 
      name: 'LinkedIn', 
      handle: 'AI BI Analytics',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      color: '#0A66C2'
    },
    { 
      name: 'GitHub', 
      handle: 'aibi-analytics',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
      color: '#333'
    },
  ];

  const teamMembers = [
    { name: 'Kaleab Girma', role: 'Founder & CEO', avatar: 'KG' },
    { name: 'Tsadu Zeray', role: 'CMO', avatar: 'TZ' },
  ];

  return (
    <div className="about-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-icon about">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div className="header-text">
          <h1>About</h1>
          <p>Learn more about AI BI Analytics and our mission</p>
        </div>
      </div>

      {/* App Info Card */}
      <div className="app-info-card">
        <div className="app-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="app-name">
            <h2>AI BI Analytics</h2>
            <p>Transform your data into insights</p>
          </div>
        </div>

        <div className="version-info">
          <div className="version-item">
            <span className="label">Version</span>
            <span className="value">{appVersion}</span>
          </div>
          <div className="version-divider" />
          <div className="version-item">
            <span className="label">Build</span>
            <span className="value">{buildNumber}</span>
          </div>
          <div className="version-divider" />
          <div className="version-item">
            <span className="label">Status</span>
            <span className="value status">
              <span className="status-dot" />
              All systems operational
            </span>
          </div>
        </div>

        <button className="check-updates-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          Check for Updates
        </button>
      </div>

      {/* Mission Statement */}
      <div className="settings-card mission-card">
        <div className="mission-content">
          <div className="quote-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
            </svg>
          </div>
          <blockquote>
            We believe everyone should have the power to understand their data. 
            Our mission is to democratize data analytics by making it as simple as having a conversation.
          </blockquote>
          <div className="mission-footer">
            <span className="company-name">The AI BI Team</span>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Leadership Team</h2>
        </div>
        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <div key={index} className="team-member">
              <div className="member-avatar" style={{ 
                background: `linear-gradient(135deg, ${
                  ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b'][index]
                } 0%, ${
                  ['#2563eb', '#059669', '#7c3aed', '#d97706'][index]
                } 100%)` 
              }}>
                {member.avatar}
              </div>
              <div className="member-info">
                <h4>{member.name}</h4>
                <p>{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legal Documents */}
      <div className="settings-card">
        <div className="card-header">
          <h2>Legal</h2>
        </div>
        <div className="legal-list">
          {legalLinks.map((link, index) => (
            <button key={index} className="legal-item">
              <div className="legal-icon">
                {link.icon === 'document' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                )}
                {link.icon === 'shield' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                )}
                {link.icon === 'cookie' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="8" cy="9" r="1" />
                    <circle cx="15" cy="9" r="1" />
                    <circle cx="10" cy="15" r="1" />
                    <circle cx="15" cy="14" r="1" />
                  </svg>
                )}
                {link.icon === 'database' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                )}
                {link.icon === 'check' && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                )}
              </div>
              <span>{link.title}</span>
              <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="social-section">
        <h3>Follow Us</h3>
        <div className="social-links">
          {socialLinks.map((social, index) => (
            <button key={index} className="social-link" style={{ '--social-color': social.color } as React.CSSProperties}>
              <div className="social-icon">
                {social.icon}
              </div>
              <div className="social-info">
                <span className="social-name">{social.name}</span>
                <span className="social-handle">{social.handle}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="about-footer">
        <p>© 2024 AI BI Analytics. All rights reserved.</p>
        <p>Made with ❤️ in San Francisco, CA</p>
      </div>
    </div>
  );
}

