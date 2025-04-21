import React, { useEffect, useState } from 'react';

interface HighlightEffectProps {
  children: React.ReactNode;
}

const HighlightEffect: React.FC<HighlightEffectProps> = ({ children }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    setOpacity(0.5);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  const styles = {
    spotlight: {
      position: 'absolute' as const,
      inset: 0,
      pointerEvents: 'none' as const,
      userSelect: 'none' as const,
      opacity,
      background: `radial-gradient(circle at ${position.x}px ${position.y}px, #ffffff37, transparent 64%)`,
      transition: 'opacity 400ms ease',
    },
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {children}
      <div style={styles.spotlight} />
    </div>
  );
};

export default HighlightEffect;
