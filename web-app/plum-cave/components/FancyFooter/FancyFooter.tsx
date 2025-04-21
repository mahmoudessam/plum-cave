"use client"
import { useEffect, useRef, useState } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { useTranslation } from 'react-i18next';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;
#define PI 3.14159265359
uniform float iTime;
uniform vec3 iResolution;
uniform float uSpinRotation;
uniform float uSpinSpeed;
uniform vec2 uOffset;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform vec4 uColor3;
uniform float uContrast;
uniform float uLighting;
uniform float uSpinAmount;
uniform float uPixelFilter;
uniform float uSpinEase;
uniform bool uIsRotate;
uniform vec2 uMouse;
varying vec2 vUv;

vec4 effect(vec2 screenSize, vec2 screen_coords) {
  float pixel_size = length(screenSize.xy) / uPixelFilter;
  vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize.xy) / length(screenSize.xy) - uOffset;
  float uv_len = length(uv);
  float speed = (uSpinRotation * uSpinEase * 0.2);
  if(uIsRotate){
    speed = iTime * speed;
  }
  speed += 302.2;
  float mouseInfluence = (uMouse.x * 2.0 - 1.0);
  speed += mouseInfluence * 0.1;
  float new_pixel_angle = atan(uv.y, uv.x) + speed - uSpinEase * 20.0 * (uSpinAmount * uv_len + (1.0 - uSpinAmount));
  vec2 mid = (screenSize.xy / length(screenSize.xy)) / 2.0;
  uv = (vec2(uv_len * cos(new_pixel_angle) + mid.x, uv_len * sin(new_pixel_angle) + mid.y) - mid);
  uv *= 30.0;
  float baseSpeed = iTime * uSpinSpeed;
  speed = baseSpeed + mouseInfluence * 2.0;
  vec2 uv2 = vec2(uv.x + uv.y);
  for(int i = 0; i < 5; i++) {
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv += 0.5 * vec2(cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121), sin(uv2.x - 0.113 * speed));
    uv -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
  }
  float contrast_mod = (0.25 * uContrast + 0.5 * uSpinAmount + 1.2);
  float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
  float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
  float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
  float c3p = 1.0 - min(1.0, c1p + c2p);
  float light = (uLighting - 0.2) * max(c1p * 5.0 - 4.0, 0.0) + uLighting * max(c2p * 5.0 - 4.0, 0.0);
  return (0.3 / uContrast) * uColor1 + (1.0 - 0.3 / uContrast) * (uColor1 * c1p + uColor2 * c2p + vec4(c3p * uColor3.rgb, c3p * uColor1.a)) + light;
}

void main() {
  vec2 uv = vUv * iResolution.xy;
  gl_FragColor = effect(iResolution.xy, uv);
}
`;

function hexToVec4(hex: string): [number, number, number, number] {
  let hexStr = hex.replace('#', '');
  let r = 0, g = 0, b = 0, a = 1;
  if (hexStr.length === 6) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
  } else if (hexStr.length === 8) {
    r = parseInt(hexStr.slice(0, 2), 16) / 255;
    g = parseInt(hexStr.slice(2, 4), 16) / 255;
    b = parseInt(hexStr.slice(4, 6), 16) / 255;
    a = parseInt(hexStr.slice(6, 8), 16) / 255;
  }
  return [r, g, b, a];
}

const FancyFooter = () => {
  const { t, i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [fontSize, setFontSize] = useState('1rem');

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

  useEffect(() => {
    const updateFontSize = () => {
      if (window.innerWidth < 520) {
        setFontSize('0.8rem');
      } else {
        setFontSize('1rem');
      }
    };
    window.addEventListener('resize', updateFontSize);
    updateFontSize(); // Initial check
    return () => {
      window.removeEventListener('resize', updateFontSize);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const renderer = new Renderer();
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    let program: Program | null = null;

    function resize() {
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      if (program) {
        program.uniforms.iResolution.value = [
          gl.canvas.width,
          gl.canvas.height,
          gl.canvas.width / gl.canvas.height,
        ];
      }
    }

    window.addEventListener('resize', resize);
    resize();

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height] },
        uSpinRotation: { value: -3.0 },
        uSpinSpeed: { value: 7.0 },
        uOffset: { value: [0.0, 0.0] },
        uColor1: { value: hexToVec4(getComputedStyle(document.documentElement).getPropertyValue('--first-theme-color').trim()) },
        uColor2: { value: hexToVec4(getComputedStyle(document.documentElement).getPropertyValue('--second-theme-color').trim()) },
        uColor3: { value: hexToVec4('#151419') },
        uContrast: { value: 4 },
        uLighting: { value: 0.4 },
        uSpinAmount: { value: 0.25 },
        uPixelFilter: { value: 745.0 },
        uSpinEase: { value: 1.0 },
        uIsRotate: { value: false },
        uMouse: { value: [0.5, 0.5] },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    let animationFrameId: number;

    function update(time: number) {
      animationFrameId = requestAnimationFrame(update);
      if (program) {
        program.uniforms.iTime.value = time * 0.0008;
      }
      renderer.render({ scene: mesh });
    }

    animationFrameId = requestAnimationFrame(update);
    container.appendChild(gl.canvas);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', resize);
      container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return (
    <div
      className="footer-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '40px',
        outline: '1px solid var(--lightened-background-adjacent-color)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        direction: i18n.language === 'he' ? 'rtl' : 'ltr',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={containerRef} className="shader-background" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <div className="overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(21, 20, 25, 0.7)', backdropFilter: 'blur(10px) saturate(90%)' }} />
      <div className="footer-content" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '1rem' }}>
        <span className="footer-text" style={{ fontSize: fontSize, textAlign: 'center', flexGrow: 1, color: 'var(--foreground)' }}>
            <>
              {t('footer-text-start')}{' '}
              <a href="https://maxim-bortnikov.netlify.app/" target="_blank" className="hover-link1">
                {t('footer-text-name')}
              </a>{' '}
              {t('footer-text-using')}{' '}
              <a href="https://nextjs.org/" target="_blank" className="hover-link2">
                {t('footer-text-next-js')}
              </a>
            </>
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          userSelect: 'none',
          opacity,
          background: `radial-gradient(circle at ${position.x}px ${position.y}px, #00000050, transparent 64%)`,
          transition: 'opacity 400ms ease',
        }}
      />
      <style jsx>{`
        .hover-link1,
        .hover-link2 {
          color: var(--foreground);
          text-decoration: none;
          position: relative;
          transition: color 0.3s ease-in-out;
        }
        .hover-link1::before,
        .hover-link2::before {
          position: absolute;
          content: '';
          width: 100%;
          height: 1px;
          background-color: var(--foreground);
          transform: scale(1, 1);
          transition: background-color 0.3s ease-in-out, transform 0.3s ease-in-out;
          bottom: 0px;
        }
        .hover-link1:hover {
          color: #bd65f7;
        }
        .hover-link2:hover {
          color: #9077f2;
        }
        .hover-link1:hover::before {
          transform: scaleX(0);
        }
        .hover-link2:hover::before {
          transform: scaleX(0);
        }
      `}</style>
    </div>
  );
};

export default FancyFooter;
