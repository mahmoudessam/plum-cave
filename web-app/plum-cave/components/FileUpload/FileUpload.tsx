"use client";
import React, { useRef, useState, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { IconUpload, IconFile } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Renderer, Program, Mesh, Triangle } from "ogl";

// Animation Variants
const mainVariant = {
  initial: { x: 0, y: 0 },
  animate: { x: 20, y: -20 },
};

const secondaryVariant = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

interface FileUploadProps {
  onChange: (file: File | null, isSingleFile: boolean) => void;
}

const isRTLCheck = (text: string): boolean => {
  return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/.test(text);
};

function hexToVec4(hex: string) {
  let hexStr = hex.replace("#", "");
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
      uv += 0.5 * vec2( cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121), sin(uv2.x - 0.113 * speed) );
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

function Balatro({
  spinRotation = -3.0,
  spinSpeed = 7.0,
  offset = [0.0, 0.0],
  color1 = "#A43BEC",
  color2 = "#603DEC",
  color3 = "#151419",
  contrast = 4,
  lighting = 0.4,
  spinAmount = 0.25,
  pixelFilter = 745.0,
  spinEase = 1.0,
  isRotate = false,
  mouseInteraction = true,
}: {
  spinRotation?: number;
  spinSpeed?: number;
  offset?: [number, number];
  color1?: string;
  color2?: string;
  color3?: string;
  contrast?: number;
  lighting?: number;
  spinAmount?: number;
  pixelFilter?: number;
  spinEase?: number;
  isRotate?: boolean;
  mouseInteraction?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const renderer = new Renderer();
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    let program: Program;

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

    window.addEventListener("resize", resize);
    resize();

    const geometry = new Triangle(gl);
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: [gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height] },
        uSpinRotation: { value: spinRotation },
        uSpinSpeed: { value: spinSpeed },
        uOffset: { value: offset },
        uColor1: { value: hexToVec4(color1) },
        uColor2: { value: hexToVec4(color2) },
        uColor3: { value: hexToVec4(color3) },
        uContrast: { value: contrast },
        uLighting: { value: lighting },
        uSpinAmount: { value: spinAmount },
        uPixelFilter: { value: pixelFilter },
        uSpinEase: { value: spinEase },
        uIsRotate: { value: isRotate },
        uMouse: { value: [0.5, 0.5] },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    let animationFrameId: number;

    function update(time: number) {
      animationFrameId = requestAnimationFrame(update);
      program.uniforms.iTime.value = time * 0.0008;
      renderer.render({ scene: mesh });
    }

    animationFrameId = requestAnimationFrame(update);
    container.appendChild(gl.canvas);


    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    spinRotation,
    spinSpeed,
    offset,
    color1,
    color2,
    color3,
    contrast,
    lighting,
    spinAmount,
    pixelFilter,
    spinEase,
    isRotate,
    mouseInteraction,
  ]);

  return <div ref={containerRef} className="absolute inset-0 opacity-50" />;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconControls = useAnimation();
  const [isDragActive, setIsDragActive] = useState(false);
  const { t, i18n } = useTranslation(); // Get translation context here

  // Update mainVariant based on RTL
  mainVariant.animate.x = i18n.language === 'he' ? -20 : 20;

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 1) {
      onChange(null, false);
      return;
    }
    onChange(droppedFiles[0], true);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (selectedFiles.length > 1) {
        onChange(null, false);
        return;
      }
      onChange(selectedFiles[0], true);
    }
  };

  useEffect(() => {
    iconControls.start({ color: "var(--foreground)" });
  }, [isDragActive, iconControls]);

  const uploadText = t("upload-file");
  const dragDropText = t("drag-and-drop-file-or-click-to-browse");
  const hoverText = t("release-to-upload");
  const isRTL = isRTLCheck(uploadText) || isRTLCheck(dragDropText);

  return (
    <div
      className="w-full relative group cursor-auto hover:cursor-pointer"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <div>
        <div className="absolute inset-0 bg-transparent z-50" />
        <motion.div
          initial="initial"
          animate={isDragActive ? "animate" : "initial"}
          className="p-14 group/file block w-full relative overflow-hidden h-[300px]"
          style={{
            backgroundColor: "var(--background)",
            outline: "1px solid var(--background-adjacent-color)",
          }}
        >
          <input ref={fileInputRef} id="file-upload-handle" type="file" onChange={handleFileInput} className="hidden" />
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
            <GridPattern />
          </div>
          <Balatro />
          <div className="flex flex-col items-center justify-center h-full relative z-10">
            <p className="font-sans font-bold text-[var(--foreground)] text-lg" dir={isRTL ? "rtl" : "ltr"}>
              {uploadText}
            </p>
            <p className="font-sans font-normal text-[var(--foreground)] text-lg mt-2" dir={isRTL ? "rtl" : "ltr"}>
              {isDragActive ? hoverText : dragDropText}
            </p>
            <div className="relative w-full mt-10 max-w-xl mx-auto">
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative group-hover/file:shadow-2xl z-40 bg-[var(--background)] flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto"
                style={{ outline: "1px solid var(--background-adjacent-color)" }}
              >
                <motion.div animate={iconControls}>
                  {isDragActive ? <IconFile className="h-8 w-8" /> : <IconUpload className="h-8 w-8" />}
                </motion.div>
              </motion.div>
              <motion.div variants={secondaryVariant} className="absolute opacity-0 border border-dashed border-[var(--foreground)] inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto"></motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );  
};

function GridPattern() {
  const columns = 41;
  const rows = 11;
  return (
    <div className="flex bg-[var(--navbar-background)] shrink-0 flex-wrap justify-center items-center gap-x-px gap-y-px scale-105">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => {
          const index = row * columns + col;
          return (
            <div
              key={`${col}-${row}`}
              className={`w-10 h-10 flex shrink-0 rounded-[2px] ${
                index % 2 === 0 ? "bg-[var(--background)]" : "bg-[var(--background)] shadow-[0px_0px_1px_3px_var(--navbar-background)_inset]"
              }`}
            />
          );
        })
      )}
    </div>
  );
}
