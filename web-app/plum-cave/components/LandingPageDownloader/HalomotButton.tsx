'use client';
import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';

interface HalomotButtonProps {
  gradient?: string;
  text: string;
  onClick: () => void;
  fillWidth?: boolean;
  isLoading?: boolean;
  isRTL?: boolean;
}

const rotation = keyframes`
  0% {
    transform: rotateX(45deg) rotateY(0) rotateZ(45deg);
    animation-timing-function: cubic-bezier(0.17, 0.84, 0.44, 1);
  }
  50% {
    transform: rotateX(45deg) rotateY(0) rotateZ(405deg);
    animation-timing-function: cubic-bezier(0.76, 0.05, 0.86, 0.06);
  }
  100% {
    transform: rotateX(45deg) rotateY(0) rotateZ(45deg);
    animation-timing-function: cubic-bezier(0.17, 0.84, 0.44, 1);
  }
`;

const bouncing = keyframes`
  0% {
    transform: translateY(-40px);
    animation-timing-function: cubic-bezier(0.76, 0.05, 0.86, 0.06);
  }
  45% {
    transform: translateY(40px);
    animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
  }
  100% {
    transform: translateY(-40px);
    animation-timing-function: cubic-bezier(0.76, 0.05, 0.86, 0.06);
  }
`;

const bouncingShadow = keyframes`
  0% {
    transform: translateZ(-80px) scale(1.3);
    animation-timing-function: cubic-bezier(0.76, 0.05, 0.86, 0.06);
    opacity: 0.05;
  }
  45% {
    transform: translateZ(0);
    animation-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
    opacity: 0.3;
  }
  100% {
    transform: translateZ(-80px) scale(1.3);
    animation-timing-function: cubic-bezier(0.76, 0.05, 0.86, 0.06);
    opacity: 0.05;
  }
`;

const Scene = styled.div`
  position: relative;
  z-index: 2;
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  perspective: 800px;
`;

const CubeWrapper = styled.div`
  transform-style: preserve-3d;
  animation: ${bouncing} 2s infinite;
  transform: scale(0.25);
`;

const Cube = styled.div`
  transform-style: preserve-3d;
  transform: rotateX(45deg) rotateZ(45deg);
  animation: ${rotation} 2s infinite;
`;

const CubeFaces = styled.div`
  transform-style: preserve-3d;
  height: 80px;
  width: 80px;
  position: relative;
  transform-origin: 0 0;
  transform: translateX(0) translateY(0) translateZ(-40px);
`;

const CubeFace = styled.div`
  position: absolute;
  inset: 0;
  background: var(--second-theme-color);
  border: solid 1px var(--background);

  &.shadow {
    transform: translateZ(-80px);
    animation: ${bouncingShadow} 2s infinite;
  }

  &.top {
    transform: translateZ(80px);
  }

  &.front {
    transform-origin: 0 50%;
    transform: rotateY(-90deg);
  }

  &.back {
    transform-origin: 0 50%;
    transform: rotateY(-90deg) translateZ(-80px);
  }

  &.right {
    transform-origin: 50% 0;
    transform: rotateX(-90deg) translateY(-80px);
  }

  &.left {
    transform-origin: 50% 0;
    transform: rotateX(-90deg) translateY(-80px) translateZ(80px);
  }
`;

const LoaderContainer = styled.div<{ isRTL: boolean }>`
  display: flex;
  align-items: center;
  padding: 0 8px;
  ${(props) =>
    props.isRTL
      ? css`
          flex-direction: row;
        `
      : css`
          flex-direction: row-reverse;
        `}
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  cursor: not-allowed;
`;

const TextSpan = styled.span<{ isRTL: boolean }>`
  color: #fff;
  font-weight: bold;
  transform: translateX(${(props) => (props.isRTL ? '14px' : '-14px')});
`;

const HalomotButton: React.FC<HalomotButtonProps> = ({
  gradient = 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))',
  text,
  onClick,
  fillWidth = false,
  isLoading = false,
  isRTL = false,
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
    cursor: isLoading ? 'not-allowed' : 'pointer',
    pointerEvents: isLoading ? 'none' : 'auto',
    position: 'relative',
  };

  const spanStyle: React.CSSProperties = {
    background: isHovered ? 'none' : '#151419',
    padding: fillWidth ? '1rem 0' : '1rem 4rem',
    border: '0',
    borderRadius: '0px',
    width: '100%',
    height: '100%',
    transition: 'background 300ms',
    display: fillWidth ? 'flex' : 'block',
    justifyContent: fillWidth ? 'center' : 'initial',
    alignItems: fillWidth ? 'center' : 'initial',
  };

  return (
    <a
      style={buttonStyle}
      onClick={(e) => {
        e.preventDefault();
        if (!isLoading) onClick();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span style={spanStyle}>{isLoading ? "⠀" : text}</span>
      {isLoading && (
        <Overlay>
          <LoaderContainer isRTL={isRTL}>
          {isRTL &&
            <Scene style={{ transform: 'scale(0.25)' }}>
              <CubeWrapper>
                <Cube>
                  <CubeFaces>
                    <CubeFace className="cube-face shadow" />
                    <CubeFace className="cube-face bottom" />
                    <CubeFace className="cube-face top" />
                    <CubeFace className="cube-face left" />
                    <CubeFace className="cube-face right" />
                    <CubeFace className="cube-face back" />
                    <CubeFace className="cube-face front" />
                  </CubeFaces>
                </Cube>
              </CubeWrapper>
            </Scene>
            }
            <TextSpan isRTL={isRTL}>{text}</TextSpan>
            {!isRTL &&
            <Scene style={{ transform: 'scale(0.25)' }}>
              <CubeWrapper>
                <Cube>
                  <CubeFaces>
                    <CubeFace className="cube-face shadow" />
                    <CubeFace className="cube-face bottom" />
                    <CubeFace className="cube-face top" />
                    <CubeFace className="cube-face left" />
                    <CubeFace className="cube-face right" />
                    <CubeFace className="cube-face back" />
                    <CubeFace className="cube-face front" />
                  </CubeFaces>
                </Cube>
              </CubeWrapper>
            </Scene>
            }
          </LoaderContainer>
        </Overlay>
      )}
    </a>
  );
};

export default HalomotButton;
