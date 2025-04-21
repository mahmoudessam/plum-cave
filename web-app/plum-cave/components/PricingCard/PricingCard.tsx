"use client";
import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PricingCardProps {
  title: string;
  price: string;
  features: string[];
  buttonText: string;
  onButtonClick: () => void;
  defaultBackgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  spotlightColor?: string;
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  features,
  buttonText,
  onButtonClick,
  defaultBackgroundColor = 'var(--card-background)',
  borderColor = 'var(--lightened-background-adjacent-color)',
  borderWidth = '1px',
  spotlightColor = '#ffffff30',
}) => {
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
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
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
      gridTemplateRows: 'auto auto auto 1fr',
      alignItems: 'start',
      gap: '1.25em',
      color: '#eceff1',
      backgroundColor: defaultBackgroundColor,
      border: `${borderWidth} solid ${borderColor}`,
    },
    cardHeading: {
      fontSize: '1.05em',
      fontWeight: 600,
      wordBreak: 'break-word',
    },
    cardPrice: {
      fontSize: '1.75em',
      fontWeight: 700,
      wordBreak: 'break-word',
    },
    cardBullets: {
      lineHeight: 1.4,
      listStyle: 'none',
      padding: 0,
    },
    cardBulletItem: {
      position: 'relative',
      paddingLeft: isRTL ? 0 : '1.5em',
      paddingRight: isRTL ? '1.5em' : 0,
      textAlign: isRTL ? 'right' : 'left',
      wordBreak: 'break-word',
    },
    cardBulletItemBefore: {
      content: '""',
      position: 'absolute',
      left: isRTL ? 'auto' : 0,
      right: isRTL ? 0 : 'auto',
      top: '0.25em',
      width: '1em',
      height: '1em',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' width='16' title='check' fill='%23dddddd'%3E%3Cpath d='M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z' /%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'contain',
    },
    button: {
      margin: 'auto',
      padding: '1px',
      alignItems: 'center',
      textAlign: 'center',
      background: 'none',
      border: '0',
      borderRadius: '0px',
      color: '#fff',
      fontWeight: 'bold',
      display: 'flex',
      justifyContent: 'center',
      textDecoration: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      transition: 'all .3s',
      width: '100%',
      backgroundImage: isRTL
        ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))'
        : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))',
    },
    buttonSpan: {
      background: isHovered ? 'none' : '#151419',
      padding: '1rem 4rem',
      border: '0',
      borderRadius: '0px',
      width: '100%',
      height: '100%',
      transition: '300ms',
      wordBreak: 'break-word',
    },
    spotlight: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      userSelect: 'none',
      opacity,
      background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
      transition: 'opacity 400ms ease',
    },
  };

  return (
    <div
      ref={cardRef}
      style={styles.cardWrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={styles.card}>
        <h2 style={styles.cardHeading}>{title}</h2>
        <p style={styles.cardPrice}>{price}</p>
        <ul style={styles.cardBullets}>
          {features.map((feature, index) => (
            <li
              key={index}
              style={{
                ...styles.cardBulletItem,
                visibility: feature === "" ? 'hidden' : 'visible',
              }}
            >
              <span style={styles.cardBulletItemBefore}></span>
              {feature}
            </li>
          ))}
        </ul>
        <button onClick={onButtonClick} style={styles.button}>
          <span style={styles.buttonSpan}>
            {buttonText}
          </span>
        </button>
      </div>
      <div style={styles.spotlight} />
    </div>
  );
};

export default PricingCard;
