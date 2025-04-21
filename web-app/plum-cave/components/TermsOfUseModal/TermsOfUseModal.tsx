"use client";
import React from 'react';
import { useTranslation } from 'react-i18next';
import HalomotButton from '@/components/HalomotButton/HalomotButton';
import { isRTLCheck } from "@/components/utils";

interface TermsOfUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsOfUseModal: React.FC<TermsOfUseModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: "rgba(21, 20, 25, 0.7)",
      backdropFilter: "blur(10px) saturate(90%)",
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000001,
    }}>
      <div style={{
        backgroundColor: 'var(--card-background)',
        padding: '2em',
        width: '80%',
        maxWidth: '600px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        outline: '1px solid var(--lightened-background-adjacent-color)',
      }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: '0.5em',
          fontSize: '2em',
          fontWeight: 700,
          color: 'var(--foreground)'
        }}>
          {t('terms_of_use_title')}
        </h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--refresh-inscription-color)',
          direction: isRTLCheck(t('terms_of_use_text_part1')) ? 'rtl' : 'ltr'
        }}>
          {t('terms_of_use_text_part1')}
          <a className="hover-link1" href="https://example.com/terms-of-use" target="_blank" rel="noopener noreferrer">
            <strong>{t('terms_of_use_link')}</strong>
          </a>
          {t('terms_of_use_text_part2')}
        </p>
        <div style={{ textAlign: 'center', marginTop: '1.25em' }}>
          <HalomotButton
            text={t('accept_and_continue_button')}
            onClick={onClose}
            gradient={isRTL ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'}
            fillWidth
          />
        </div>
      </div>
      <style jsx>{`
        .hover-link1 {
          color: var(--refresh-inscription-color);
          text-decoration: none;
          position: relative;
          transition: color 0.3s ease-in-out;
        }
        .hover-link1::before {
          position: absolute;
          content: '';
          width: 100%;
          height: 1px;
          background-color: var(--refresh-inscription-color);
          transform: scale(1, 1);
          transition: background-color 0.3s ease-in-out, transform 0.3s ease-in-out;
          bottom: 0px;
        }
        .hover-link1:hover {
          color: ${isRTL ? '#9077f2' : '#bd65f7'};
        }
        .hover-link1:hover::before {
          transform: scaleX(0);
        }
      `}</style>
    </div>
  );
};

export default TermsOfUseModal;