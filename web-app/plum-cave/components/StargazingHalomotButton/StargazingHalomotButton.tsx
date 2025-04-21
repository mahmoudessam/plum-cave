'use client';

import React, { useState, useEffect } from 'react';
import { FaGithub, FaStar } from 'react-icons/fa';
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { useTranslation } from 'react-i18next';

interface StargazingHalomotButtonProps {
  gradient?: string;
  githubLink: string;
}

interface CounterProps {
  format?: (value: number) => string;
  targetValue: number;
  direction?: "up" | "down";
  delay?: number;
}

function Counter({ 
    format = (value: number) => Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value), 
    targetValue, 
    direction = "up", 
    delay = 0 
  }: CounterProps) {
    const ref = React.useRef<HTMLSpanElement>(null);
    const isGoingUp = direction === "up";
    const motionValue = useMotionValue(isGoingUp ? 0 : targetValue);
    const springValue = useSpring(motionValue, { damping: 60, stiffness: 80 });
    const isInView = useInView(ref, { margin: "0px", once: true });
  
    React.useEffect(() => {
      if (!isInView) return;
      const timer = setTimeout(() => {
        motionValue.set(isGoingUp ? targetValue : 0);
      }, delay);
      return () => clearTimeout(timer);
    }, [isInView, delay, isGoingUp, targetValue, motionValue]);
  
    React.useEffect(() => {
      springValue.on("change", (value) => {
        if (ref.current) {
          ref.current.textContent = format(Math.round(value));
        }
      });
    }, [springValue, format]);
  
    return <span ref={ref} />;
  }
  

const StargazingHalomotButton: React.FC<StargazingHalomotButtonProps> = ({
  gradient = 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))',
  githubLink,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    const repoPath = new URL(githubLink).pathname.slice(1);
    fetch(`https://api.github.com/repos/${repoPath}`)
      .then(response => response.json())
      .then(data => setStarCount(data.stargazers_count))
      .catch(error => console.error('Error fetching star count:', error));
  }, [githubLink]);

  const buttonStyle: React.CSSProperties = {
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
    whiteSpace: 'nowrap',
    transition: 'all .3s',
    width: 'auto',
    backgroundImage: gradient,
  };

  const spanStyle: React.CSSProperties = {
    background: isHovered ? 'none' : '#151419',
    padding: '1rem 2rem',
    border: '0',
    borderRadius: '0px',
    width: '100%',
    height: '100%',
    transition: '300ms',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  return (
    <a
      href={githubLink}
      target="_blank"
      rel="noopener noreferrer"
      style={buttonStyle}
    >
      <span
        style={spanStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <FaGithub />
          {t('star-on-github-inscription')}
        <FaStar />
        <Counter targetValue={starCount} />
      </span>
    </a>
  );
};

export default StargazingHalomotButton;
