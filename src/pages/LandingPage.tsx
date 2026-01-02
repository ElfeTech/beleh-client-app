import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import logo from '../assets/logo.webp';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  // Custom SVG Icons
  const StatIcons = {
    speed: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    target: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    chat: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M8 10h8"/>
        <path d="M8 14h4"/>
      </svg>
    ),
  };

  const FeatureIcons = {
    ai: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
        <path d="M16 14v2a4 4 0 0 1-8 0v-2"/>
        <circle cx="9" cy="9" r="1"/>
        <circle cx="15" cy="9" r="1"/>
        <path d="M12 14c-3 0-5.5 2.5-5.5 5.5V22h11v-2.5c0-3-2.5-5.5-5.5-5.5z"/>
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <rect x="7" y="10" width="3" height="8" rx="1"/>
        <rect x="12" y="6" width="3" height="12" rx="1"/>
        <rect x="17" y="13" width="3" height="5" rx="1"/>
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <circle cx="12" cy="16" r="1"/>
      </svg>
    ),
    bolt: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    brain: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
        <path d="M12 5v13"/>
        <path d="M7 10h10"/>
        <path d="M7 14h10"/>
      </svg>
    ),
    team: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  };

  const ComparisonIcons = {
    time: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    message: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    book: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <path d="M8 7h8"/>
        <path d="M8 11h6"/>
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    dollar: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
        <path d="M12 6v2"/>
        <path d="M12 16v2"/>
      </svg>
    ),
  };

  const stats = [
    { value: '10x', label: 'Faster Insights', icon: StatIcons.speed },
    { value: '0', label: 'SQL Required', icon: StatIcons.target },
    { value: '99.9%', label: 'Uptime', icon: StatIcons.shield },
    { value: '1K+', label: 'Questions Answered', icon: StatIcons.chat },
  ];

  const testimonials = [
    {
      quote: "Beleh transformed how we make decisions. What took our analysts days now takes seconds.",
      author: "Sarah Chen",
      role: "VP of Operations",
      company: "TechFlow Inc",
      avatar: "SC"
    },
    {
      quote: "Finally, our marketing team can explore data without waiting for engineering support.",
      author: "Marcus Johnson",
      role: "CMO",
      company: "GrowthMetrics",
      avatar: "MJ"
    },
    {
      quote: "The AI understands context perfectly. It's like having a data analyst available 24/7.",
      author: "Elena Rodriguez",
      role: "Head of Analytics",
      company: "DataDriven Co",
      avatar: "ER"
    }
  ];

  const features = [
    {
      icon: FeatureIcons.ai,
      title: 'AI-Powered Intelligence',
      description: 'Natural language queries powered by advanced AI that understands your business context.',
      gradient: 'feature-gradient-1'
    },
    {
      icon: FeatureIcons.chart,
      title: 'Instant Visualizations',
      description: 'Beautiful charts and graphs generated automatically. Export and share with one click.',
      gradient: 'feature-gradient-2'
    },
    {
      icon: FeatureIcons.lock,
      title: 'Enterprise Security',
      description: 'Bank-level encryption, SOC 2 compliant, and complete data isolation between workspaces.',
      gradient: 'feature-gradient-3'
    },
    {
      icon: FeatureIcons.bolt,
      title: 'Lightning Fast',
      description: 'Get answers in milliseconds, not minutes. Handle datasets of any size effortlessly.',
      gradient: 'feature-gradient-4'
    },
    {
      icon: FeatureIcons.brain,
      title: 'Smart Data Understanding',
      description: 'Automatically detects patterns, relationships, and anomalies in your data.',
      gradient: 'feature-gradient-5'
    },
    {
      icon: FeatureIcons.team,
      title: 'Team Collaboration',
      description: 'Share insights, workspaces, and chat sessions. Built for teams of any size.',
      gradient: 'feature-gradient-6'
    }
  ];

  return (
    <div className="landing-page-v2">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* Navigation */}
      <nav className={`nav-v2 ${isScrolled ? 'nav-scrolled' : ''}`}>
        <div className="nav-container-v2">
          <div className="nav-logo-v2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src={logo} alt="Beleh" className="logo-image" />
          </div>
          
          <div className={`nav-menu-v2 ${mobileMenuOpen ? 'menu-open' : ''}`}>
            <button onClick={() => scrollToSection('features')} className="nav-link-v2">
              Features
            </button>
            <button onClick={() => scrollToSection('how-it-works')} className="nav-link-v2">
              How It Works
            </button>
            <button onClick={() => scrollToSection('testimonials')} className="nav-link-v2">
              Testimonials
            </button>
            <button onClick={() => scrollToSection('pricing')} className="nav-link-v2">
              Pricing
            </button>
          </div>

          <div className="nav-actions-v2">
            <button onClick={() => navigate('/signin')} className="btn-ghost-v2">
              Sign In
            </button>
            <button onClick={() => navigate('/signup')} className="btn-primary-v2">
              <span>Start Free</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      </nav>

      {/* Hero Section - Light Modern Design */}
      <section className="hero-light">
        {/* Background Effects */}
        <div className="hero-bg-light">
          {/* Wavy Lines Pattern */}
          <svg className="wavy-lines-light" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradLight1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
                <stop offset="50%" stopColor="rgba(59, 130, 246, 0.15)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
              </linearGradient>
              <linearGradient id="lineGradLight2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0)" />
                <stop offset="50%" stopColor="rgba(16, 185, 129, 0.1)" />
                <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
              </linearGradient>
            </defs>
            {[...Array(8)].map((_, i) => (
              <path
                key={`wave-${i}`}
                className="wave-path-light"
                d={`M-100,${400 + i * 25} Q200,${350 + i * 20} 400,${420 + i * 15} T800,${380 + i * 20} T1200,${450 + i * 25}`}
                fill="none"
                stroke={i % 2 === 0 ? "url(#lineGradLight1)" : "url(#lineGradLight2)"}
                strokeWidth="1.5"
                style={{ '--wave-delay': `${i * 0.2}s` } as React.CSSProperties}
              />
            ))}
          </svg>
          
          {/* Glowing Orb */}
          <div className="hero-glow-orb-light"></div>
          <div className="hero-glow-orb-secondary-light"></div>
        </div>

        <div className="hero-light-container">
          {/* Left Content */}
          <div className="hero-light-content">
            <span className="hero-tagline-light">ANALYZE SMARTER, NOT HARDER</span>
            
            <h1 className="hero-light-title">
              <span className="title-dark">Turn data into</span>
              <span className="title-dark">decisions with</span>
              <span className="title-gradient-light">AI Intelligence</span>
            </h1>
            
            <p className="hero-light-subtitle">
              Ask questions in plain English. Get instant answers, beautiful 
              charts, and actionable insights no SQL, no expertise, no dashboards, no complexity.
            </p>

            <div className="hero-light-cta">
              <button onClick={() => navigate('/signup')} className="btn-light-primary">
                <span>Get Started Free</span>
                <div className="btn-glow-light"></div>
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="btn-light-outline">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 7L12 10L8 13" fill="currentColor"/>
                </svg>
                <span>Watch Demo</span>
              </button>
            </div>
          </div>

          {/* Right Visual - 3D Tilted Mockup with Chat Demo */}
          <div className="hero-light-visual">
            <div className="mockup-3d-container-light">
              {/* Background glow behind mockup */}
              <div className="mockup-backdrop-glow-light"></div>
              
              {/* Main mockup window - tilted */}
              <div className="mockup-3d-window-light">
                <div className="mockup-3d-header-light">
                  <div className="window-dots-light">
                    <span className="dot red"></span>
                    <span className="dot yellow"></span>
                    <span className="dot green"></span>
                  </div>
                  <div className="mockup-3d-title-light">Beleh Analytics</div>
                </div>
                <div className="mockup-3d-body-light">
                  {/* Chat Interface Demo */}
                  <div className="chat-demo">
                    <div className="chat-message-demo user">
                      <div className="chat-avatar-demo user-avatar">You</div>
                      <div className="chat-bubble-demo user-bubble">
                        What were our top performing products last quarter?
                      </div>
                    </div>
                    <div className="chat-message-demo ai">
                      <div className="chat-avatar-demo ai-avatar">AI</div>
                      <div className="chat-bubble-demo ai-bubble">
                        <p className="ai-response-text">Based on your Q3 data, here are your top 5 products by revenue:</p>
                        <div className="demo-chart">
                          <div className="demo-bar" style={{ '--bar-height': '100%' } as React.CSSProperties}>
                            <span className="bar-label-demo">Product A</span>
                          </div>
                          <div className="demo-bar" style={{ '--bar-height': '78%' } as React.CSSProperties}>
                            <span className="bar-label-demo">Product B</span>
                          </div>
                          <div className="demo-bar" style={{ '--bar-height': '65%' } as React.CSSProperties}>
                            <span className="bar-label-demo">Product C</span>
                          </div>
                          <div className="demo-bar" style={{ '--bar-height': '52%' } as React.CSSProperties}>
                            <span className="bar-label-demo">Product D</span>
                          </div>
                          <div className="demo-bar" style={{ '--bar-height': '40%' } as React.CSSProperties}>
                            <span className="bar-label-demo">Product E</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Input Area */}
                  <div className="demo-input-area">
                    <div className="demo-input">
                      <span>Ask anything about your data...</span>
                      <div className="demo-send-btn">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second tilted window (behind) */}
              <div className="mockup-3d-window-light secondary">
                <div className="mockup-3d-header-light">
                  <div className="window-dots-light">
                    <span className="dot red"></span>
                    <span className="dot yellow"></span>
                    <span className="dot green"></span>
                  </div>
                </div>
                <div className="mockup-3d-body-light faded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card" style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem-section-v2">
        <div className="section-container-v2">
          <div className="section-header-v2">
            <span className="section-tag">The Problem</span>
            <h2 className="section-title-v2">
              Traditional Analytics is <span className="strike">Broken</span>
            </h2>
            <p className="section-desc">
              Your team spends more time wrestling with tools than finding insights.
            </p>
          </div>

          <div className="problem-grid-v2">
            <div className="problem-card-v2">
              <div className="problem-icon-v2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <h3>Weeks to Build Dashboards</h3>
              <p>Traditional BI tools require extensive setup before you see any value. Time is money.</p>
              <div className="problem-stat">
                <span className="stat-bad">6-8 weeks</span>
                <span className="stat-desc">average setup time</span>
              </div>
            </div>

            <div className="problem-card-v2">
              <div className="problem-icon-v2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
              </div>
              <h3>SQL Skills Required</h3>
              <p>Not everyone knows SQL. Your team shouldn't need a computer science degree.</p>
              <div className="problem-stat">
                <span className="stat-bad">78%</span>
                <span className="stat-desc">of employees can't write SQL</span>
              </div>
            </div>

            <div className="problem-card-v2">
              <div className="problem-icon-v2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h3>Bottlenecked by Experts</h3>
              <p>Waiting for data analysts creates delays. Decisions get postponed. Opportunities missed.</p>
              <div className="problem-stat">
                <span className="stat-bad">3-5 days</span>
                <span className="stat-desc">average wait time for reports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution / How It Works */}
      <section id="how-it-works" className="solution-section-v2">
        <div className="section-container-v2">
          <div className="section-header-v2">
            <span className="section-tag">The Solution</span>
            <h2 className="section-title-v2">
              From Question to Insight in <span className="highlight">Seconds</span>
            </h2>
            <p className="section-desc">
              Three simple steps. Zero learning curve. Infinite possibilities.
            </p>
          </div>

          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-visual">
                <div className="step-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17,8 12,3 7,8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
              </div>
              <h3>Upload Your Data</h3>
              <p>CSV, Excel, or connect directly. Drag, drop, done.</p>
            </div>

            <div className="step-connector">
              <svg viewBox="0 0 100 20" fill="none">
                <path d="M0 10 H85 L75 5 M85 10 L75 15" stroke="url(#connector-gradient)" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-visual">
                <div className="step-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
              </div>
              <h3>Ask Questions</h3>
              <p>Type naturally like you're talking to a colleague.</p>
            </div>

            <div className="step-connector">
              <svg viewBox="0 0 100 20" fill="none">
                <path d="M0 10 H85 L75 5 M85 10 L75 15" stroke="url(#connector-gradient-2)" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="connector-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-visual">
                <div className="step-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
              </div>
              <h3>Get Insights</h3>
              <p>Instant charts, tables, and actionable answers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section-v2">
        <div className="section-container-v2">
          <div className="section-header-v2">
            <span className="section-tag">Features</span>
            <h2 className="section-title-v2">
              Everything You Need to <span className="highlight">Win</span>
            </h2>
            <p className="section-desc">
              Powerful features designed for speed, security, and simplicity.
            </p>
          </div>

          <div className="features-grid-v2">
            {features.map((feature, index) => (
              <div key={index} className={`feature-card-v2 ${feature.gradient}`}>
                <div className="feature-icon-v2">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className="feature-hover-effect"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-container-v2">
          <div className="section-header-v2">
            <span className="section-tag">Testimonials</span>
            <h2 className="section-title-v2">
              Loved by <span className="highlight">Data Teams</span>
            </h2>
          </div>

          <div className="testimonials-carousel">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className={`testimonial-card ${index === activeTestimonial ? 'active' : ''}`}
              >
                <div className="quote-mark">"</div>
                <p className="testimonial-quote">{testimonial.quote}</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.avatar}</div>
                  <div className="author-info">
                    <div className="author-name">{testimonial.author}</div>
                    <div className="author-role">{testimonial.role} at {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="testimonial-dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === activeTestimonial ? 'active' : ''}`}
                onClick={() => setActiveTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="pricing" className="comparison-section-v2">
        <div className="section-container-v2">
          <div className="section-header-v2">
            <span className="section-tag">Comparison</span>
            <h2 className="section-title-v2">
              Why Choose <span className="highlight">Beleh</span>?
            </h2>
          </div>

          <div className="comparison-table-v2">
            <div className="comparison-header-v2">
              <div className="comp-cell header-label"></div>
              <div className="comp-cell header-beleh">
                <img src={logo} alt="Beleh" className="comp-logo" />
              </div>
              <div className="comp-cell header-other">Traditional BI</div>
            </div>

            <div className="comparison-body">
              {[
                { label: 'Time to First Insight', beleh: 'Minutes', other: 'Weeks', icon: ComparisonIcons.time },
                { label: 'Query Interface', beleh: 'Natural Language', other: 'SQL / Complex UI', icon: ComparisonIcons.message },
                { label: 'Setup Required', beleh: 'Zero', other: 'Extensive', icon: ComparisonIcons.settings },
                { label: 'Learning Curve', beleh: 'None', other: 'Weeks of Training', icon: ComparisonIcons.book },
                { label: 'For Non-Technical Users', beleh: 'Perfect', other: 'Difficult', icon: ComparisonIcons.users },
                { label: 'Cost', beleh: 'Affordable', other: 'Expensive', icon: ComparisonIcons.dollar },
              ].map((row) => (
                <div key={`comp-${row.label}`} className="comp-row">
                  <div className="comp-cell row-label">
                    <span className="row-icon">{row.icon}</span>
                    {row.label}
                  </div>
                  <div className="comp-cell row-beleh">
                    <span className="check-icon">✓</span>
                    {row.beleh}
                  </div>
                  <div className="comp-cell row-other">
                    <span className="cross-icon">✗</span>
                    {row.other}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-v2">
        <div className="cta-bg-effects">
          <div className="cta-orb cta-orb-1"></div>
          <div className="cta-orb cta-orb-2"></div>
        </div>
        <div className="cta-content-v2">
          <h2 className="cta-title-v2">
            Ready to Transform Your Data?
          </h2>
          <p className="cta-subtitle-v2">
            Join thousands of teams making smarter decisions with Beleh.
            <br />Start free. No credit card required.
          </p>
          <div className="cta-buttons-v2">
            <button onClick={() => navigate('/signup')} className="btn-cta-primary">
              <span>Get Started Free</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button onClick={() => navigate('/signin')} className="btn-cta-secondary">
              Sign In to Your Account
            </button>
          </div>
          <div className="cta-features">
            <div className="cta-feature">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Free tier available</span>
            </div>
            <div className="cta-feature">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="cta-feature">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-v2 footer-minimal">
        <div className="footer-container-v2">
          <div className="footer-bottom-v2">
            <div className="footer-logo-minimal">
              <img src={logo} alt="Beleh" />
            </div>
            <div className="copyright">
              © {new Date().getFullYear()} ElfeTech. All rights reserved.
            </div>
            <div className="footer-badges">
              <span className="badge">🔒 SOC 2 Compliant</span>
              <span className="badge">🛡️ GDPR Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
