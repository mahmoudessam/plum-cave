'use client';

import React, { useState } from 'react';

interface HalomotButtonProps {
  gradient?: string;
  text: string;
  onClick: () => void;
  fillWidth?: boolean;
}

const HalomotButton: React.FC<HalomotButtonProps> = ({
  gradient = 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))',
  text,
  onClick,
  fillWidth = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle: React.CSSProperties = {
    margin: fillWidth ? '0' : 'auto',
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
    whiteSpace: 'nowrap',
    transition: 'all .3s',
    width: fillWidth ? '100%' : '50%',
    backgroundImage: gradient,
  };

  const spanStyle: React.CSSProperties = {
    background: isHovered ? 'none' : '#151419',
    padding: fillWidth ? '1rem 0' : '1rem 4rem',
    border: '0',
    borderRadius: '0px',
    width: '100%',
    height: '100%',
    transition: '300ms',
    display: fillWidth ? 'flex' : 'block',
    justifyContent: fillWidth ? 'center' : 'initial',
    alignItems: fillWidth ? 'center' : 'initial',
  };

  return (
    <a
      style={buttonStyle}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <span
        style={spanStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {text}
      </span>
    </a>
  );
};

export default HalomotButton;
