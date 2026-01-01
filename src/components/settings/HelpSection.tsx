import { useState } from 'react';
import './HelpSection.css';

interface FAQItem {
  question: string;
  answer: string;
}

export function HelpSection() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  const faqs: FAQItem[] = [
    {
      question: 'How do I upload a dataset?',
      answer: 'To upload a dataset, navigate to your workspace and click the "Add Dataset" button. You can upload CSV, Excel (.xlsx), or JSON files. The maximum file size is 50MB for the free plan and 500MB for premium plans.'
    },
    {
      question: 'What types of questions can I ask about my data?',
      answer: 'You can ask natural language questions about your data such as "Show me total sales by region", "What was the average order value last month?", or "Create a chart showing trends over time". Our AI understands context and can generate SQL queries, visualizations, and insights.'
    },
    {
      question: 'How do I invite team members?',
      answer: 'Go to Settings > Members and click "Invite Member". Enter their email address and select their role (Admin, Editor, or Viewer). They will receive an invitation email to join your workspace.'
    },
    {
      question: 'What happens when I reach my query limit?',
      answer: 'When you reach your monthly query limit, you will need to upgrade your plan to continue making queries. Your existing data and visualizations will remain accessible. You can also wait until your billing cycle resets.'
    },
    {
      question: 'Can I export my visualizations?',
      answer: 'Yes! Click the export icon on any chart or visualization to download it as a PNG image or PDF. You can also export the underlying data as CSV or Excel format.'
    },
  ];

  const quickLinks = [
    {
      title: 'Getting Started Guide',
      description: 'Learn the basics of setting up your workspace',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      color: '#3b82f6',
    },
    {
      title: 'Video Tutorials',
      description: 'Watch step-by-step video guides',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
      color: '#ef4444',
    },
    {
      title: 'API Documentation',
      description: 'Technical docs for developers',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      color: '#10b981',
    },
    {
      title: 'Community Forum',
      description: 'Connect with other users',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      color: '#8b5cf6',
    },
  ];

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle ticket submission
    alert('Support ticket submitted! We will get back to you within 24 hours.');
    setContactSubject('');
    setContactMessage('');
  };

  return (
    <div className="help-section">
      {/* Header */}
      <div className="section-header">
        <div className="header-icon help">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="header-text">
          <h1>Help & Support</h1>
          <p>Find answers, get help, and contact our support team</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="quick-links-grid">
        {quickLinks.map((link, index) => (
          <button key={index} className="quick-link-card">
            <div className="quick-link-icon" style={{ background: `${link.color}15`, color: link.color }}>
              {link.icon}
            </div>
            <div className="quick-link-content">
              <h3>{link.title}</h3>
              <p>{link.description}</p>
            </div>
            <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="settings-card faq-card">
        <div className="card-header">
          <div className="header-with-icon">
            <div className="header-icon-small faq">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2>Frequently Asked Questions</h2>
          </div>
        </div>

        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}
            >
              <button 
                className="faq-question"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <span>{faq.question}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="settings-card contact-card">
        <div className="card-header">
          <div className="header-with-icon">
            <div className="header-icon-small contact">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h2>Contact Support</h2>
          </div>
          <span className="response-time">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Avg. response: 4 hours
          </span>
        </div>

        <form className="contact-form" onSubmit={handleSubmitTicket}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <select 
                id="subject"
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                required
              >
                <option value="">Select a topic</option>
                <option value="billing">Billing & Payments</option>
                <option value="technical">Technical Issue</option>
                <option value="feature">Feature Request</option>
                <option value="account">Account & Access</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Describe your issue or question in detail..."
              rows={5}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Message
            </button>
          </div>
        </form>
      </div>

      {/* Alternative Contact Methods */}
      <div className="contact-methods">
        <div className="contact-method">
          <div className="method-icon email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="method-content">
            <h4>Email</h4>
            <p>support@beleh.ai</p>
          </div>
        </div>

        <div className="contact-method">
          <div className="method-icon twitter">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
          <div className="method-content">
            <h4>Twitter / X</h4>
            <p>@beleh_support</p>
          </div>
        </div>

        <div className="contact-method">
          <div className="method-icon chat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
          </div>
          <div className="method-content">
            <h4>Live Chat</h4>
            <p>Available 9am - 6pm EST</p>
          </div>
        </div>
      </div>
    </div>
  );
}

