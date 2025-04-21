"use client";
import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface InfoCardProps {
  title: string;
  inscription: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, inscription }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    card.addEventListener('mousemove', handleMouseMove);
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleMouseEnter = () => {
    setOpacity(0.6);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
    setIsHovered(false);
  };

  const styles: { [key: string]: React.CSSProperties } = {
    cardWrapper: {
      direction: isRTL ? 'rtl' : 'ltr',
      display: 'inline-block',
      fontSize: '1.1rem',
      lineHeight: 1.2,
      color: '#ddd',
      position: 'relative',
      overflow: 'hidden',
    },
    card: {
      padding: '1.5em 2em',
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr',
      alignItems: 'start',
      gap: '1.25em',
      color: '#eceff1',
      backgroundColor: 'var(--card-background)',
      border: '1px solid var(--lightened-background-adjacent-color)',
    },
    cardHeading: {
      fontSize: '1.05em',
      fontWeight: 600,
      wordBreak: 'break-word',
      direction: isRTL ? 'rtl' : 'ltr',
    },
    cardInscription: {
      fontSize: '1.75em',
      fontWeight: 700,
      wordBreak: 'break-word',
      direction: 'ltr',
      textAlign: isRTL ? 'right' : 'left',
    },
    spotlight: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      userSelect: 'none',
      opacity,
      background: `radial-gradient(circle at ${position.x}px ${position.y}px, #ffffff30, transparent 80%)`,
      transition: 'opacity 400ms ease',
    },
  };

  return (
    <div ref={cardRef} style={styles.cardWrapper} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div style={styles.card}>
        <h2 style={styles.cardHeading}>{title}</h2>
        <p style={styles.cardInscription}>{inscription}</p>
      </div>
      <div style={styles.spotlight} />
    </div>
  );
};

export default InfoCard;
