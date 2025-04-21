'use client';
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import HalomotButton from './HalomotButton';
import DreamyInput from '@/components/DreamyInput/DreamyInput';
import StructuredBlock from '@/components/StructuredBlock/StructuredBlock';
import { Balatro, Section, Container, addRTLProps, headlineProps, textProps, contentProps, BalatroContentContainer, PaddinglessDiv, IntegrityMessage } from './ComponentPart';
import { toast } from "react-toastify";
import { base64ToUint8Array, evaluateSharedBackupIntegrity } from "@/components/utils";
import { fetchAndDecryptBackupById } from '@/components/DecryptMetadataUsingBackupTag/DecryptMetadataUsingBackupTag';
import type { Backup } from '../types';
import DecryptModal from '@/components/FileEncrypter/DecryptModal';
import useBackupDownloader from '@/components/BackupDownloader/BackupDownloader';
import FileDecrypterForSharedBackups from '@/components/FileEncrypter/FileDecrypterForSharedBackups'
import DownloadFileModal from '@/components/DownloadFileModal/DownloadFileModal';
import Swal from 'sweetalert2'; // Import SweetAlert2
// Styled components
const EntryContainer = styled.div<{ dynamicHeight: string; dynamicPadding: string }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: ${(props) => props.dynamicHeight};
  padding: ${(props) => props.dynamicPadding};
  position: relative;
`;

const LandingPageDownloader = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he'; // Determine RTL based on language
  const [dynamicHeight, setDynamicHeight] = useState('auto');
  const [dynamicPadding, setDynamicPadding] = useState('24px');
  const [isMobile, setIsMobile] = useState(false);
  const tagRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const balatroContainerRef = useRef<HTMLDivElement>(null);
  const [currentBackupDetails, setCurrentBackupDetails] = useState<Backup | null>(null);
  const [isBackupDetailsModalOpen, setIsBackupDetailsModalOpen] = useState(false);
  const [owner, setOwner] = useState<string>("Unknown");
  const [messages, setMessages] = useState<IntegrityMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { downloadBackupChunks } = useBackupDownloader();
  const [decryptionPropsForSharedBackup, setDecryptionPropsForSharedBackup] = useState<FileDecrypterForSharedBackupsProps | null>(null);
  const [isDecryptModalForSharedBackup, setIsDecryptModalForSharedBackup] = useState(false);
  const [fileKey, setFileKey] =  useState<Uint8Array>();
  const [backupState, setBackupState] = useState<{
    backup: Backup | null;
    integrityChecks: { fileIntegrityCompromised: boolean; recordIntegrity: boolean } | null;
    decryptedFileContent: Uint8Array;
    userEmail: string | null;
  }>({
    backup: null,
    integrityChecks: null,
    decryptedFileContent: new Uint8Array,
    userEmail: null,
  });
  const [downloaderForSharedBackup, setDownloaderForSharedBackup] = useState(false);

  // Function to calculate dimensions
  const calculateDimensions = () => {
    if (sectionRef.current) {
      setIsMobile(sectionRef.current.offsetWidth < 768); // Mobile threshold
    }
    if (headlineRef.current && textRef.current && balatroContainerRef.current) {
      const headlineHeight = headlineRef.current.getBoundingClientRect().height || 0;
      const textHeight = textRef.current.getBoundingClientRect().height || 0;
      const balatroContentHeight = balatroContainerRef.current.getBoundingClientRect().height || 0;
      const spacerHeight = isMobile ? 14 : 27;
      const availableHeight = window.innerHeight - (69 + headlineHeight + textHeight + spacerHeight);
      setDynamicHeight(`${availableHeight}px`);
      const calculatedPaddingTopBottom = Math.max((availableHeight - balatroContentHeight) / 2, 24);
      const calculatedPadding = `${Math.max(calculatedPaddingTopBottom, 24)}px 24px`;
      setDynamicPadding(calculatedPadding);
    } else {
      console.warn('One or more refs are null. Ensure all elements are rendered before calculations.');
    }
  };

  // Effect to handle initial calculation, delayed calculation, and resize events
  useEffect(() => {
    calculateDimensions();
    const timeoutId = setTimeout(() => {
      calculateDimensions();
    }, 1000);
    const handleResize = () => {
      calculateDimensions();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const gradientStyle = isRTL ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))';

  const handleDownload = async () => {
    const generatedTag = tagRef.current?.value.trim();

    if (!generatedTag) {
      toast.error(t('empty-tag-error'));
      return;
    }

    const parts = generatedTag.split(",");
    if (parts.length !== 4) {
      console.error("Invalid tag structure - expected [email,backupID,metadataKey,fileKey]");
      toast.error(t('invalid-tag-error'));
      return;
    }

    const [emailPart, backupID, metadataKey, fileKey] = parts;

    try {
      // Validate components
      const emailBytes = base64ToUint8Array(emailPart);
      const decodedEmail = new TextDecoder().decode(emailBytes);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(decodedEmail)) throw new Error('Invalid email');
      if (base64ToUint8Array(fileKey).length !== 416) throw new Error('Invalid file key');
      if (base64ToUint8Array(metadataKey).length !== 672) throw new Error('Invalid metadata key');
      if (new TextEncoder().encode(backupID).length !== 10) throw new Error('Invalid backup ID');

      setIsLoading(true);

      // Convert keys
      const metadataKeyBytes = base64ToUint8Array(metadataKey);

      // Fetch and decrypt backup
      const backup = await fetchAndDecryptBackupById(decodedEmail, backupID, metadataKeyBytes);

      // Evaluate integrity
      const backupState = evaluateSharedBackupIntegrity(backup, t);
      setOwner(decodedEmail);
      setMessages(backupState);
      setCurrentBackupDetails(backup);
      setFileKey(base64ToUint8Array(fileKey));
      setIsBackupDetailsModalOpen(true);
    } catch (error) {
      console.error("Metadata extraction error:", error);
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `;
      
      showErrorModal(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseBackupDetailsModal = () => {
    setIsBackupDetailsModalOpen(false);
    setCurrentBackupDetails(null);
  };

  interface FileDecrypterForSharedBackupsProps {
    derivedFileKey: Uint8Array;
    encryptedFileContent: Uint8Array;
    encryptedRecordIntegrityTag?: Uint8Array;
    encodedDecryptedFilename?: Uint8Array;
    encodedDecryptedDescription?: Uint8Array;
    onClose: (result: { decryptedFileContent: Uint8Array; fileIntegrityCompromised: boolean; recordIntegrity: boolean; isThereAnError: boolean; errorMessage: string; }) => void;
  }

  const showErrorModal = (errorMessage: string) => {
    Swal.fire({
      icon: "error",
      title: t('error_inscription'),
      html: errorMessage,
      width: 600,
      padding: "3em",
      color: "var(--foreground)",
      background: "var(--card-background)",
      confirmButtonText: t('ok_button'),
      showConfirmButton: false,
      footer: `<a class="btn_grd ${isRTL ? 'rtl' : 'ltr'}"><span>${t('ok_button')}</span></a>`,
      customClass: {
        popup: "swal-custom-popup",
        footer: "swal-custom-footer",
      },
      didOpen: () => {
        const button = Swal.getFooter()?.querySelector('.btn_grd');
        if (button) {
          button.addEventListener('click', () => Swal.close());
        } else {
          console.error("Button element not found!");
        }
      }
    });
  };

  const handleDownloadBackup = async (backupId: string) => {
    setIsBackupDetailsModalOpen(false);
    try {
      const userEmail = owner;
      if (!currentBackupDetails || !userEmail){
        throw new Error("System Error: Backup details are missing. Please reload the page and try again.");
      }
      if (!fileKey) {
        throw new Error("System Error: File key is missing. Please try again or use a different backup tag.");
      }
      const targetBackup = currentBackupDetails;
      const encryptionData = {
        encodedFilename: targetBackup.decryptedResult?.decryptedFilename || null,
        encodedDescription: targetBackup.decryptedResult?.decryptedDescription || null,
        encryptedMetadataTag: targetBackup.encryptedData?.encryptedMetadataTag?.value || null,
        recordIntegrityTag: targetBackup.encryptedRecordIntegrityTag?.value,
      };

      const encryptedLength = typeof targetBackup.encryptedSize === 'number' && targetBackup.encryptedSize > 0 ? targetBackup.encryptedSize : null;
      const encryptedFileContent = await downloadBackupChunks(userEmail, backupId, encryptedLength);
      const encoder = new TextEncoder();
      const fileDecrypterProps: FileDecrypterForSharedBackupsProps = {
        derivedFileKey: fileKey,
        encryptedFileContent,
        encryptedRecordIntegrityTag: encryptionData.recordIntegrityTag || undefined,
        encodedDecryptedFilename: encryptionData.encodedFilename ? encoder.encode(encryptionData.encodedFilename) : undefined,
        encodedDecryptedDescription: encryptionData.encodedDescription ? encoder.encode(encryptionData.encodedDescription) : undefined,
        onClose: (result) => {
          //console.log('Decryption result:', result);
          if (result.isThereAnError) {
            console.error('Decryption error:', result.errorMessage);
            setIsDecryptModalForSharedBackup(false);
            setDecryptionPropsForSharedBackup(null);
            showErrorModal(
              `<p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p> <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`
            );
          } else {
            // Set the decrypted file content, backup object, and integrity checks to the hook
            setBackupState({
              backup: targetBackup,
              integrityChecks: {
                fileIntegrityCompromised: result.fileIntegrityCompromised,
                recordIntegrity: result.recordIntegrity,
              },
              decryptedFileContent: result.decryptedFileContent,
              userEmail: userEmail,
            });

            // Set the downloader visible after a short delay to ensure state is set
            setTimeout(() => {
              setIsDecryptModalForSharedBackup(false);
              setDownloaderForSharedBackup(true);
            }, 100);
          }
        },
      };

      // Set states for modal display
      setDecryptionPropsForSharedBackup(fileDecrypterProps);
      setIsDecryptModalForSharedBackup(true);

    } catch (error) {
      showErrorModal(
        `<p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p> <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`
      );
      console.error('Download failed:', error);
    }
  };

  const closeDownloadModalForSharedBackup = () => {
    setDownloaderForSharedBackup(false);
  };

  return (
    <>
    {downloaderForSharedBackup && backupState.backup && (
      <DownloadFileModal
        backup={backupState.backup}
        fileIntegrityCompromised={backupState.integrityChecks?.fileIntegrityCompromised || false}
        recordIntegrity={backupState.integrityChecks?.recordIntegrity || false}
        decryptedFileContent={backupState.decryptedFileContent}
        messagesListHeader={t("backup-state")}
        firstButtonText={t("save-as")}
        secondButtonText={t("close")}
        onClose={closeDownloadModalForSharedBackup}
        userEmail={backupState.userEmail || ""}
        displayMessagesForSharedBackup
      />
    )}
      {isDecryptModalForSharedBackup && decryptionPropsForSharedBackup && (
        <FileDecrypterForSharedBackups {...decryptionPropsForSharedBackup} />
      )}
      {isBackupDetailsModalOpen && currentBackupDetails && (
        <DecryptModal
          headline={t("backup-details")}
          backup={currentBackupDetails}
          messagesListHeader={t("backup-state")}
          firstButtonText={t("download")}
          secondButtonText={t("close")}
          onButtonClicked={(buttonType) => {
            if (buttonType === "second") {
              handleCloseBackupDetailsModal();
            } else if (buttonType === "first") {
              handleDownloadBackup(currentBackupDetails.id);
            }
          }}
          displayFirstButton={true}
          owner={owner}
          messages={messages}
        />
      )}
      <Section style={{ transform: 'translateY(-1px)' }} id="landing-page-downloader" ref={sectionRef}>
        <Container>
          <PaddinglessDiv ref={headlineRef}>
            <StructuredBlock {...addRTLProps(headlineProps, isRTL)}>
              {t('section-downloader')}
            </StructuredBlock>
          </PaddinglessDiv>
          <PaddinglessDiv ref={textRef}>
            <StructuredBlock {...addRTLProps(textProps, isRTL)}>
              {t('downloader-section-text')}
            </StructuredBlock>
          </PaddinglessDiv>
          <StructuredBlock {...addRTLProps(contentProps, isRTL)}>
            <EntryContainer dynamicHeight={dynamicHeight} dynamicPadding={dynamicPadding}>
              <Balatro />
              <BalatroContentContainer ref={balatroContainerRef}>
                <DreamyInput
                  placeholder={t('paste-backup-text')}
                  outlineColor={gradientStyle}
                  outlineColorHover={gradientStyle}
                  backgroundColor="var(--background)"
                  ref={tagRef}
                />
                <HalomotButton
                  text={isLoading ? t('fetching-metadata') : t('download')}
                  onClick={handleDownload}
                  fillWidth
                  gradient={gradientStyle}
                  isLoading={isLoading}
                  isRTL={isRTL}
                />
              </BalatroContentContainer>
            </EntryContainer>
          </StructuredBlock>
        </Container>
      </Section>
    </>
  );
};

export default LandingPageDownloader;
