import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { SLIDES_DATA } from './types';
import { BackgroundWave } from './components/BackgroundWave';
import { Navigation } from './components/Navigation';
import { SpeakerNotes } from './components/SpeakerNotes';
import { sfx } from './audio';

// Slides
import { Slide01Cover } from './slides/Slide01Cover';
import { Slide02Concept } from './slides/Slide02Concept';
import { Slide03Problem } from './slides/Slide03Problem';
import { Slide04Consequences } from './slides/Slide04Consequences';
import { Slide05Opportunity } from './slides/Slide05Opportunity';
import { Slide06Solution } from './slides/Slide06Solution';
import { Slide07Demo } from './slides/Slide07Demo';
import { Slide08Future } from './slides/Slide08Future';
import { Slide09Closing } from './slides/Slide09Closing';
import { LinksHub } from './components/LinksHub';

export default function App() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isConfirmingStreetFighter, setIsConfirmingStreetFighter] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [transformStyle, setTransformStyle] = useState<string>('');
  const [showHub, setShowHub] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('hub') === '1' || window.location.hash === '#hub';
    }
    return false;
  });

  const stageRef = useRef<HTMLDivElement>(null);
  const slideContentRef = useRef<HTMLDivElement>(null);

  // Exact 16:9 canonical 1920x1080 stage scaler with pixel-perfect center positioning
  const fit = useCallback(() => {
    const w = window.innerWidth || document.documentElement.clientWidth || 1920;
    const h = window.innerHeight || document.documentElement.clientHeight || 1080;
    const s = Math.min(w / 1920, h / 1080);
    const x = (w - 1920 * s) / 2;
    const y = (h - 1080 * s) / 2;
    setTransformStyle(`translate(${x}px, ${y}px) scale(${s})`);
  }, []);

  useEffect(() => {
    fit();
    window.addEventListener('resize', fit);
    // Extra fit call after brief mount timeout to catch iframe dimension changes
    const timer = setTimeout(fit, 100);
    return () => {
      window.removeEventListener('resize', fit);
      clearTimeout(timer);
    };
  }, [fit]);

  // Navigate to slide with animation
  const goToSlide = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= SLIDES_DATA.length || targetIndex === currentSlide) return;

    // Special Street Fighter confirm flash when leaving Slide 01 to Slide 02
    if (currentSlide === 0 && targetIndex === 1) {
      setIsConfirmingStreetFighter(true);
      setTimeout(() => {
        setIsConfirmingStreetFighter(false);
        performSlideChange(targetIndex);
      }, 550);
      return;
    }

    performSlideChange(targetIndex);
  }, [currentSlide]);

  const performSlideChange = (targetIndex: number) => {
    sfx.playTransition();

    if (slideContentRef.current) {
      gsap.to(slideContentRef.current, {
        opacity: 0,
        y: -15,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => {
          setCurrentSlide(targetIndex);
          gsap.fromTo(
            slideContentRef.current,
            { opacity: 0, y: 25 },
            { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }
          );
        },
      });
    } else {
      setCurrentSlide(targetIndex);
    }
  };

  const nextSlide = useCallback(() => {
    if (currentSlide < SLIDES_DATA.length - 1) {
      goToSlide(currentSlide + 1);
    }
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      goToSlide(currentSlide - 1);
    }
  }, [currentSlide, goToSlide]);

  const restartPresentation = useCallback(() => {
    goToSlide(0);
  }, [goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input or textarea is active
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(SLIDES_DATA.length - 1);
          break;
        case 'r':
        case 'R':
          restartPresentation();
          break;
        case 'n':
        case 'N':
          setIsNotesOpen((prev) => !prev);
          break;
        case 'f':
        case 'F':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, goToSlide, restartPresentation]);

  // Auto-play timer
  useEffect(() => {
    if (!autoPlay) return;

    const timer = window.setInterval(() => {
      if (currentSlide < SLIDES_DATA.length - 1) {
        nextSlide();
      } else {
        setAutoPlay(false);
      }
    }, 12000);

    return () => clearInterval(timer);
  }, [autoPlay, currentSlide, nextSlide]);

  const currentSlideInfo = SLIDES_DATA[currentSlide];

  // Render current active slide component
  const renderSlideContent = () => {
    switch (currentSlide) {
      case 0:
        return <Slide01Cover isConfirming={isConfirmingStreetFighter} />;
      case 1:
        return <Slide02Concept />;
      case 2:
        return <Slide03Problem />;
      case 3:
        return <Slide04Consequences />;
      case 4:
        return <Slide05Opportunity />;
      case 5:
        return <Slide06Solution />;
      case 6:
        return <Slide07Demo />;
      case 7:
        return <Slide08Future />;
      case 8:
        return (
          <Slide09Closing
            onRestart={restartPresentation}
            onOpenHub={() => setShowHub(true)}
          />
        );
      default:
        return null;
    }
  };

  const handleCloseHub = () => {
    setShowHub(false);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const u = new URL(window.location.href);
      u.searchParams.delete('hub');
      u.hash = '';
      window.history.replaceState({}, '', u.toString());
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#040416] flex items-center justify-center">
      {/* 16:9 Canvas Stage (1920x1080 Canonical Dimensions Scaled Proportionally) */}
      <div
        ref={stageRef}
        id="presentation-stage"
        className="absolute left-0 top-0 w-[1920px] h-[1080px] overflow-hidden shadow-2xl rounded-sm will-change-transform"
        style={{
          transformOrigin: '0 0',
          transform: transformStyle,
          background: 'linear-gradient(120deg, #07072e 0%, #17176f 55%, #3a3aa2 100%)',
        }}
      >
        {/* Dynamic Continuous Geometric Wave Mesh */}
        <BackgroundWave
          tintOpacity={currentSlideInfo.tintOpacity}
          waveTransform={currentSlideInfo.waveTransform}
        />

        {/* Slide Content Layer */}
        <div ref={slideContentRef} className="relative w-full h-full z-10">
          {renderSlideContent()}
        </div>
      </div>

      {/* Presentation Control Dock */}
      <Navigation
        currentSlide={currentSlide}
        totalSlides={SLIDES_DATA.length}
        slides={SLIDES_DATA}
        onSelectSlide={goToSlide}
        onNext={nextSlide}
        onPrev={prevSlide}
        onRestart={restartPresentation}
        isNotesOpen={isNotesOpen}
        onToggleNotes={() => setIsNotesOpen(!isNotesOpen)}
        autoPlay={autoPlay}
        onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
      />

      {/* Speaker Notes / Teleprompter Panel */}
      <SpeakerNotes
        slide={currentSlideInfo}
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
      />

      {/* Interactive Links Hub Overlay (for mobile QR scan or on-screen click) */}
      {showHub && <LinksHub onClose={handleCloseHub} />}
    </main>
  );
}
