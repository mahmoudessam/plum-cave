"use client";

import React from 'react';
import HalomotButton from '@/components/HalomotButton/HalomotButton';
import { useTranslation } from 'react-i18next';

interface ConfirmationPopUpProps {
  showConfirmPopUp: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText: string;
  cancelText: string;
  messageText: string;
  secondLineText?: string; // Optional second line text
  lineSpacing?: number; // Optional line spacing
  mirrorButtons?: boolean;
  textSize?: number;
  inscriptionColor?: string;
  backgroundColorFirst: string;
  backgroundColorSecond: string;
  borderColor: string;
  generalBorderRadius: string;
  borderWidth: number;
  modalWidth?: string;
  modalHeight?: string;
  modalPadding: string;
  marginAroundModal: string;
  inscriptionBackground?: string;
}

const ConfirmationPopUp: React.FC<ConfirmationPopUpProps> = ({
  showConfirmPopUp,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  messageText,
  secondLineText = '', // Default to an empty string
  lineSpacing = 8,
  mirrorButtons = false,
  textSize = 21,
  inscriptionColor = 'black',
  backgroundColorFirst,
  backgroundColorSecond,
  borderColor,
  generalBorderRadius,
  borderWidth,
  modalWidth = 'auto',
  modalHeight = 'auto',
  modalPadding = '1.1rem 2rem',
  marginAroundModal,
  inscriptionBackground = 'rgba(28, 30, 37, 0.7)',
}) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  return (
    <>
      {showConfirmPopUp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(21, 20, 25, 0.7)',
            backdropFilter: 'blur(10px) saturate(90%)',
            zIndex: 1000000,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: modalWidth,
              height: modalHeight,
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: modalPadding,
              border: `${borderWidth}px solid ${borderColor}`,
              borderRadius: generalBorderRadius,
              color: inscriptionColor,
              zIndex: 1000001,
              fontFamily: '"Questrial", sans-serif',
              backgroundColor: backgroundColorSecond,
              backgroundImage: `linear-gradient(45deg, ${backgroundColorFirst} 25%, transparent 25%, transparent 75%, ${backgroundColorFirst} 75%, ${backgroundColorFirst}), linear-gradient(-45deg, ${backgroundColorFirst} 25%, transparent 25%, transparent 75%, ${backgroundColorFirst} 75%, ${backgroundColorFirst})`,
              backgroundSize: '60px 60px',
              backgroundPosition: '0 0',
              animation: 'slide 4s infinite linear',
              direction: isRTL ? 'rtl' : 'ltr',
              textAlign: isRTL ? 'right' : 'left',
              margin: marginAroundModal,
            }}
          >
            <div
              style={{
                padding: '12px',
                backgroundColor: inscriptionBackground,
                borderRadius: generalBorderRadius,
                width: '100%',
                backdropFilter: 'blur(10px) saturate(90%)',
                border: `1px solid rgba(255,255,255,0.18)`,
              }}
            >
              <p style={{ fontSize: textSize, color: 'var(--foreground)', textAlign: 'center' }}>
                {messageText}
              </p>
              {secondLineText && (
                <p style={{ fontSize: textSize, color: 'var(--foreground)', textAlign: 'center', marginTop: `${lineSpacing}px` }}>
                  {secondLineText}
                </p>
              )}
            </div>
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                flexDirection: window.innerWidth < 520 ? 'column' : (isRTL ? 'row-reverse' : 'row'),
                justifyContent: 'center',
                gap: '20px',
              }}
            >
              {!mirrorButtons ? (
                <>
                  <HalomotButton
                    text={cancelText}
                    onClick={onCancel}
                    gradient={isRTL ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'}
                  />
                  <HalomotButton
                    text={confirmText}
                    onClick={onConfirm}
                    gradient={isRTL ? 'linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))' : 'linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))'}
                  />
                </>
              ) : (
                <>
                  <HalomotButton
                    text={confirmText}
                    onClick={onConfirm}
                    gradient={isRTL ? 'linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))' : 'linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))'}
                  />
                  <HalomotButton
                    text={cancelText}
                    onClick={onCancel}
                    gradient={isRTL ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes slide {
          from {
            background-position: 0 0;
          }
          to {
            background-position: -120px 60px;
          }
        }
        @media (max-width: 520px) {
          .buttons-container {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
};

export default ConfirmationPopUp;
