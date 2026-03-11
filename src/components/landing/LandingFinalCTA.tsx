import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const LandingFinalCTA = () => {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section ref={ref} className="relative py-20 sm:py-[140px] px-4 sm:px-6 overflow-hidden" style={{ background: '#1C1B1A' }}>
      {/* Background decoration */}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-heading-en font-[800] select-none pointer-events-none" style={{ fontSize: 'min(300px, 40vw)', color: 'rgba(255,255,255,0.03)' }}>ধুম!</span>

      <div className={`relative z-10 text-center max-w-[700px] mx-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
        <h2 className="font-heading-en font-[800] text-white" style={{ fontSize: 'clamp(26px, 5vw, 56px)', lineHeight: 1.1 }}>
          Your next winning ad<br />starts here.
        </h2>
        <p className="mt-4 sm:mt-6 font-body-en text-base sm:text-xl" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Join sellers using AdDhoom Studio to create professional ads in minutes.
        </p>

        <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row flex-wrap justify-center gap-3">
          <Link to="/auth" className="font-body-en text-base font-semibold text-primary-foreground bg-primary rounded-[14px] h-14 px-9 flex items-center justify-center hover:opacity-90 hover:scale-[1.02] transition-all duration-200">
            Start Creating <ArrowRight size={16} className="ml-1.5" />
          </Link>
          <a href="#pricing" className="font-body-en text-base font-medium text-white rounded-[14px] h-14 px-9 flex items-center justify-center transition-all duration-200 hover:border-white" style={{ border: '1.5px solid rgba(255,255,255,0.3)' }}>
            View Pricing
          </a>
        </div>

        <p className="mt-4 font-body-en text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          No credit card required to explore.
        </p>
      </div>
    </section>
  );
};

export default LandingFinalCTA;
