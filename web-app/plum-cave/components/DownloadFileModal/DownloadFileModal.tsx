"use client";
import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import DreamyInput from "@/components/DreamyInput/DreamyInput";
import { useTranslation } from 'react-i18next';
import HalomotButton from '@/components/HalomotButton/HalomotButton';
import { Backup } from '../types';
import { evaluateBackupIntegrityWithMessages, evaluateSharedBackupIntegrityWithMessages, generateFileSizeString, formatDate, isRTLCheck } from "@/components/utils";
import gsap from 'gsap';
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/app/lib/firebase";

interface DecryptModalProps {
  headlineFontSize?: string;
  headlineColor?: string;
  inscription?: string;
  inscriptionFontSize?: string;
  inscriptionColor?: string;
  inscriptionAboveButtons?: string;
  inscriptionAboveButtonsFontSize?: string;
  inscriptionAboveButtonsColor?: string;
  backup: Backup;
  messagesListHeader: string;
  firstButtonText: string;
  secondButtonText: string;
  fileIntegrityCompromised: boolean;
  recordIntegrity: boolean;
  onClose: () => void;
  userEmail: string;
  decryptedFileContent: Uint8Array;
  displayMessagesForSharedBackup?: boolean;
}

class SingletonEffect {
  private static instance: SingletonEffect | null = null;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): SingletonEffect {
    if (this.instance === null) {
      this.instance = new SingletonEffect();
    }
    return this.instance;
  }

  public runEffect(effect: () => void) {
    if (!this.initialized) {
      effect();
      this.initialized = true;
    }
  }

  // New method to reset the singleton instance
  public static resetInstance() {
    this.instance = null;
  }
}

const DecryptModal: React.FC<DecryptModalProps> = ({
  headlineFontSize = '1.5rem',
  headlineColor = '#fff',
  inscription,
  inscriptionFontSize = '1rem',
  inscriptionColor = '#fff',
  inscriptionAboveButtons,
  inscriptionAboveButtonsFontSize = '1rem',
  inscriptionAboveButtonsColor = '#fff',
  backup,
  messagesListHeader,
  firstButtonText,
  secondButtonText,
  fileIntegrityCompromised,
  recordIntegrity,
  onClose,
  userEmail,
  decryptedFileContent,
  displayMessagesForSharedBackup = false,
}) => {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [isMobile, setIsMobile] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const messages = displayMessagesForSharedBackup
    ? evaluateSharedBackupIntegrityWithMessages(backup, t, fileIntegrityCompromised, recordIntegrity)
    : evaluateBackupIntegrityWithMessages(backup, t, fileIntegrityCompromised, recordIntegrity);

  const name = backup.decryptedResult?.decryptedFilename || t('unknown-name');
  const description = backup.decryptedResult?.decryptedDescription || t('no-description');
  const size = backup.size && backup.size >= 1 ? generateFileSizeString(backup.size) : t('unknown');
  const encryptedSize = backup.encryptedSize ? generateFileSizeString(backup.encryptedSize) : t('unknown-size');
  const uploadDate = backup.createdAt ? formatDate(backup.createdAt, i18n.language) : t('unknown-upload-date');
  const downloads = backup.downloads !== null && backup.downloads !== undefined ? backup.downloads.toString() : t('unknown-downloads');
  const access = backup.isPublic ? t('public') : t('private');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
      const modal = modalRef.current;
      const heightThreshold = 600 + (messages.length - 1) * 140;
      if (modal) {
        const isOverflowing = modal.scrollHeight > modal.clientHeight || modal.scrollWidth > modal.clientWidth;
        const exceedsHeightThreshold = modal.scrollHeight > window.innerHeight * 0.9;
        setIsFullScreen(
          window.innerHeight < heightThreshold || isOverflowing || exceedsHeightThreshold || window.innerWidth < 640
        );
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [messages.length]);

  useEffect(() => {
    const enforceMaxDimensions = () => {
      const modal = modalRef.current;
      if (modal) {
        if (isFullScreen) {
          modal.style.maxHeight = "100vh";
          modal.style.maxWidth = "100vw";
        } else {
          modal.style.maxHeight = "90vh";
          modal.style.maxWidth = "90vw";
        }
      }
    };
    enforceMaxDimensions();
  }, [isFullScreen]);

  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      gsap.to(modal, { opacity: isFullScreen ? 1 : 1, duration: 0.3 });
    }
  }, [isFullScreen]);

  useEffect(() => {
    const singleton = SingletonEffect.getInstance();
    singleton.runEffect(async () => {
      const backupRef = doc(db, `data/${userEmail}/backups/${backup.id}`);
      await updateDoc(backupRef, { downloads: increment(1) });
    });
  }, [backup.id, userEmail]);

  const handleFirstButtonClick = () => {
    const finalChunkSize = 16;
    const finalDecryptedChunks: Uint8Array[] = [];
    for (let i = 0; i < decryptedFileContent.length; i += finalChunkSize) {
      finalDecryptedChunks.push(decryptedFileContent.slice(i, i + finalChunkSize));
    }
    const decryptedFile = new Blob(finalDecryptedChunks, { type: 'application/octet-stream' });
    const url = URL.createObjectURL(decryptedFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = backup.decryptedResult?.decryptedFilename || 'backup.bin';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSecondButtonClick = () => {
    SingletonEffect.resetInstance();
    setTimeout(onClose, 200); // Call the provided callback after a short delay
  };

  return (
    <>
      <div className="file-processing-popup" style={{ zIndex: '1000001', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflowX: 'hidden', }}>
        <div ref={modalRef} className="modal-background" style={{ width: isFullScreen ? "100vw" : "min(90vw, 640px)", height: isFullScreen ? "100vh" : "auto", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", gap: "8px", overflowY: isFullScreen ? "auto" : undefined, }}>
          <h2 style={{ fontSize: headlineFontSize, color: headlineColor, marginBottom: '0.4rem', textAlign: 'center' }}>
            {t('save-backup')}
          </h2>
          {inscription && (
            <p style={{ fontSize: inscriptionFontSize, color: inscriptionColor, marginBottom: '1rem', textAlign: 'center' }}>
              {inscription}
            </p>
          )}
          {name !== t('unknown-name') ? (
            <div style={{ width: '100%', marginTop: '1rem' }}>
              <div style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
                <label className="text-[var(--foreground)] font-semibold" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <span dir={isRTLCheck(t('name')) ? 'rtl' : 'ltr'}>{t('name')}:</span>
                </label>
              </div>
              <div style={{ height: '6px' }}></div>
              <DreamyInput placeholder="" presetText={name} readOnly={true} outlineColor={
                i18n.language === 'he' ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
              } outlineColorHover={
                i18n.language === 'he' ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
              } backgroundColor="var(--background)" />
            </div>
          ) : (
            <div style={{ width: '100%', marginTop: '1rem' }}>
              <div style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
                <label className="text-[var(--foreground)] font-semibold" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <span dir={isRTLCheck(t('unknown-name')) ? 'rtl' : 'ltr'}>{t('unknown-name')}</span>
                </label>
              </div>
            </div>
          )}
          {description !== t('no-description') ? (
            <div style={{ width: '100%', marginTop: '1rem' }}>
              <div style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
                <label className="text-[var(--foreground)] font-semibold" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <span dir={isRTLCheck(t('description')) ? 'rtl' : 'ltr'}>{t('description')}:</span>
                </label>
              </div>
              <div style={{ height: '6px' }}></div>
              <DreamyInput placeholder="" presetText={description} readOnly={true} multiLine={true} multiLineHeight={isMobile ? 3.2 : 4.18} outlineColor={
                i18n.language === 'he' ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
              } outlineColorHover={
                i18n.language === 'he' ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
              } backgroundColor="var(--background)" />
            </div>
          ) : (
            <div style={{ width: '100%', marginTop: '1rem' }}>
              <div style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
                <label className="text-[var(--foreground)] font-semibold" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <span dir={isRTLCheck(t('no-description')) ? 'rtl' : 'ltr'}>{t('no-description')}</span>
                </label>
              </div>
            </div>
          )}
          <div style={{ width: '100%', marginTop: '1rem' }}>
            <div className="flex" style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
              <label className="text-[var(--foreground)] font-semibold" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                <span dir={isRTLCheck(t('size')) ? 'rtl' : 'ltr'}>{t('size')}:</span>
              </label>
              <span style={{ marginLeft: isRTL ? '0' : '8px', marginRight: isRTL ? '8px' : '0', color: 'var(--foreground)', direction: 'ltr' }}>{size}</span>
            </div>
          </div>
          {uploadDate !== t('unknown-upload-date') ? (
            <div style={{ width: '100%', marginTop: '1rem' }}>
              <div style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
                <label className="text-[var(--foreground)] font-semibold" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <span dir={isRTLCheck(t('upload-date')) ? 'rtl' : 'ltr'}>{t('upload-date')}:</span>
                </label>
                <span style={{ marginLeft: isRTL ? '0' : '8px', marginRight: isRTL ? '8px' : '0', color: 'var(--foreground)' }}>{uploadDate}</span>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', marginTop: '1rem' }}>
              <div style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
                <label className="text-[var(--foreground)] font-semibold" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <span dir={isRTLCheck(t('unknown-upload-date')) ? 'rtl' : 'ltr'}>{t('unknown-upload-date')}</span>
                </label>
              </div>
            </div>
          )}
          {messages.length > 0 && (
            <div style={{ width: '100%', marginTop: '1rem' }}>
              <div style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
                <label className="text-[var(--foreground)] font-semibold" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  <span dir={isRTLCheck(messagesListHeader) ? 'rtl' : 'ltr'}>
                    {messagesListHeader}:
                  </span>
                </label>
              </div>
              <div style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#151419 #151419', marginTop: '1rem' }}>
                {messages.map((message, index) => (
                  <div key={index} dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ margin: '4px', transform: isRTL ? 'scaleX(-1)' : undefined }}>
                      {message.success ? (
                        <ShieldCheck size={16} style={{ color: '#059C47' }} />
                      ) : (
                        <ShieldOff size={16} style={{ color: '#BD064D' }} />
                      )}
                    </span>
                    <span style={{ color: 'var(--foreground)' }}>{message.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {inscriptionAboveButtons && (
            <p dir={isRTL ? 'rtl' : 'ltr'} style={{ fontSize: inscriptionAboveButtonsFontSize, color: inscriptionAboveButtonsColor, marginBottom: '1rem', width: '100%' }}>
              {inscriptionAboveButtons}
            </p>
          )}
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', width: '100%' }}>
            {isRTL && !isMobile ? (
              <>
                <HalomotButton text={secondButtonText} onClick={handleSecondButtonClick} gradient={
                  i18n.language === 'he' ? 'linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))' : 'linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))'
                } fillWidth={isMobile} />
                <HalomotButton text={firstButtonText} onClick={handleFirstButtonClick} gradient={
                  i18n.language === 'he' ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
                } fillWidth={isMobile} />
              </>
            ) : (
              <>
                <HalomotButton text={firstButtonText} onClick={handleFirstButtonClick} gradient={
                  i18n.language === 'he' ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
                } fillWidth={isMobile} />
                <HalomotButton text={secondButtonText} onClick={handleSecondButtonClick} gradient={
                  i18n.language === 'he' ? 'linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))' : 'linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))'
                } fillWidth={isMobile} />
              </>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .file-processing-popup {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(21, 20, 25, 0.7);
          backdrop-filter: blur(10px) saturate(90%);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-background {
          background: var(--card-background);
          border: 1px solid var(--lightened-background-adjacent-color);
        }
      `}</style>
    </>
  );  
};

export default DecryptModal;
