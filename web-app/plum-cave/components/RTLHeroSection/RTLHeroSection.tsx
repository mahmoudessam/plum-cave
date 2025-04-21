'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import StargazingHalomotButton from 'components/StargazingHalomotButton/StargazingHalomotButton';

const Player = dynamic(
  () => import('@lottiefiles/react-lottie-player').then(mod => mod.Player),
  { ssr: false }
);

interface RTLHeroSectionProps {
  topText: string[];
  subTextLine1: string;
  subTextLine2: string;
  mobilePadding?: string;
  desktopPadding?: string;
}

const RTLHeroSection: React.FC<RTLHeroSectionProps> = ({
  topText,
  subTextLine1,
  subTextLine2,
  mobilePadding = '4px',
  desktopPadding = '18px',
}) => {
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const isMobile = windowWidth < 768;

  const calculateFontSize = (baseSize: number) => {
    const scaleFactor = Math.min(windowWidth / 1200, 1);
    return `${baseSize * scaleFactor * (isMobile ? 1.75 : 1)}px`;
  };

  const calculateIconSize = () => {
    if (isMobile) {
      return Math.min(windowWidth * 0.47, 708);
    } else {
      const maxSize = 708;
      const minSize = 400;
      const scaleFactor = (windowWidth - 768) / (1920 - 768);
      return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * scaleFactor));
    }
  };

  const calculateTranslateX = () => {
    if (isMobile) return 0;
    const maxTranslate = 59;
    const minTranslate = 40;
    const scaleFactor = (windowWidth - 768) / (1200 - 768);
    return Math.max(minTranslate, Math.min(maxTranslate, minTranslate + (maxTranslate - minTranslate) * scaleFactor));
  };

  const topTextSize = calculateFontSize(80);
  const subTextSize = calculateFontSize(24);
  const iconSize = `${calculateIconSize()}px`;
  const translateX = calculateTranslateX();
  const mobileSpacing = '24px';

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'auto',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: mobilePadding,
        overflowX: 'hidden',
        textAlign: 'center',
        direction: 'rtl',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
        }}>
          <div style={{ marginBottom: mobileSpacing }}>
            {topText.map((word, index) => (
              <React.Fragment key={index}>
                <span style={{
                  fontSize: topTextSize,
                  color: 'var(--foreground)',
                  display: 'block',
                  fontWeight: '700',
                }}>
                  {word}
                </span>
                {index < topText.length - 1 && <div />}
              </React.Fragment>
            ))}
          </div>
          <p style={{ fontSize: subTextSize, color: 'var(--foreground)', marginBottom: '8px' }}>{subTextLine1}</p>
          <p style={{ fontSize: subTextSize, color: 'var(--foreground)', marginBottom: mobileSpacing }}>{subTextLine2}</p>
          <div style={{ width: 'auto', padding: 0, marginBottom: '20px' }}>
            <StargazingHalomotButton
              githubLink="https://github.com/Northstrix/plum-cave"
              gradient={`linear-gradient(to left, var(--first-theme-color), var(--second-theme-color))`}
            />
          </div>
        </div>
        <div style={{ width: 'auto', padding: 0, marginBottom: '20px' }}>
          <div style={{ marginBottom: mobileSpacing }}>
            <Player autoplay loop src="/complex-animation.json" style={{ height: iconSize, width: iconSize }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row-reverse',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 69px)',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: desktopPadding,
      paddingBottom: '69px',
      overflowX: 'hidden',
      direction: 'rtl',
    }}>
      <div style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: `translateX(-${translateX}px)`,
      }}>
        <Player autoplay loop src="/complex-animation.json" style={{ height: iconSize, width: iconSize, transform: 'scaleX(-1)' }} />
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        textAlign: 'right',
        width: '100%',
      }}>
        <div style={{ marginBottom: '32px' }}>
          {topText.map((word, index) => (
            <React.Fragment key={index}>
              <span style={{
                fontSize: topTextSize,
                color: 'var(--foreground)',
                display: 'block',
                fontWeight: '700',
              }}>
                {word}
              </span>
              {index < topText.length - 1 && <div />}
            </React.Fragment>
          ))}
        </div>
        <p style={{ fontSize: subTextSize, color: 'var(--foreground)', marginBottom: '8px' }}>{subTextLine1}</p>
        <p style={{ fontSize: subTextSize, color: 'var(--foreground)', marginBottom: '32px' }}>{subTextLine2}</p>
        <div style={{ width: 'auto', padding: 0 }}>
          <StargazingHalomotButton
            githubLink="https://github.com/Northstrix/plum-cave"
            gradient={`linear-gradient(to left, var(--first-theme-color), var(--second-theme-color))`}
          />
        </div>
      </div>
    </div>
  );
};

export default RTLHeroSection;
