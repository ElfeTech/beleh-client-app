import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { LandingHelpChat } from './LandingHelpChat';
import { LANDING_FAQ } from './landingFaqData';

const SCRIPT_ID = 'landing-faq-jsonld';

export function LandingFaq() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [everShown, setEverShown] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = SCRIPT_ID;
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: LANDING_FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setEverShown(true);
        else setDismissed(false);
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const open = inView && !dismissed;

  return (
    <section
      ref={sectionRef}
      className="landing-section landing-faq"
      id="faq"
      aria-labelledby="faq-title"
    >
      <div className="landing-wrap landing-faq__wrap">
        <h2 id="faq-title">Questions about AI business intelligence, answered</h2>
        <div className="landing-faq__list">
          {LANDING_FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {everShown ? (
        <aside
          className={`landing-chat-pop${open ? ' is-open' : ''}`}
          aria-label="Ask Beleh"
          aria-hidden={!open}
        >
          <button
            type="button"
            className="landing-chat-pop__close"
            aria-label="Close chat"
            onClick={() => setDismissed(true)}
          >
            <X size={16} />
          </button>
          <LandingHelpChat />
        </aside>
      ) : null}
    </section>
  );
}
