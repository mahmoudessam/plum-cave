"use client";
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconDownload, IconShare, IconTrash } from '@tabler/icons-react';
import { AnimatedTooltip } from '@/components/AnimatedTooltip/AnimatedTooltip';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import { evaluateSharedBackupIntegrity, generateFileSizeString, formatDate, isRTLCheck } from "@/components/utils";
import type { SharedBackup } from '../types';
import HighlightEffect from './HighlightEffect';
import ConfirmationPopUp from '@/components/ConfirmationPopUp/ConfirmationPopUp';
import ChooseHowToShareBackupModal from "./ChooseHowToShareBackupModal";
import DisplayShareableTagForBackup from "@/components/Dashboard/DisplayShareableTagForBackup";
import GetRecipientEmail from "@/components/Dashboard/GetRecipientEmail";

interface ReceivedBackupsComponentProps {
  backups: SharedBackup[];
  onDeleteBackup: (backup: SharedBackup) => void;
  onDownloadBackup: (backup: SharedBackup) => void;
  onShareBackup: (backup: SharedBackup, email: string, tag: string) => void;
}

const ReceivedBackupsComponent: React.FC<ReceivedBackupsComponentProps> = ({
  backups,
  onDeleteBackup,
  onDownloadBackup,
  onShareBackup,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [backupStates, setBackupStates] = useState<{ text: string; success: boolean }[][]>([]);
  const [showDeleteBackupModal, setShowDeleteBackupModal] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<SharedBackup | null>(null);
  const [showChooseHowToShareModal, setShowChooseHowToShareModal] = useState(false);
  const [showDisplayTagModal, setShowDisplayTagModal] = useState(false);
  const [showGetRecipientEmailModal, setShowGetRecipientEmailModal] = useState(false);
  const [backupToShare, setBackupToShare] = useState<SharedBackup | null>(null);
  const [generatedTag, setGeneratedTag] = useState<string | null>(null);

  useEffect(() => {
    const updatedBackupStates = backups.map(backup => evaluateSharedBackupIntegrity(backup, t));
    setBackupStates(updatedBackupStates);
  }, [backups, t]);

  const handleDeleteBackup = (backup: SharedBackup) => {
    setBackupToDelete(backup);
    setShowDeleteBackupModal(true);
  };

  const confirmDeleteBackup = (confirmed: boolean) => {
    if (confirmed && backupToDelete) {
      onDeleteBackup(backupToDelete);
    }
    setShowDeleteBackupModal(false);
  };

  const handleShareBackup = (backup: SharedBackup) => {
    setBackupToShare(backup);
    setShowChooseHowToShareModal(true);
  };

  const handleAction = (actionType: "get-shareable-tag" | "send-to-user", projectId: string, backupId: string) => {
    if (actionType === "get-shareable-tag") {
      const backup = backups.find(b => b.id === backupId && b.localIdentifier === projectId);
      if (backup && backup.tag) {
        setGeneratedTag(backup.tag);
        setShowDisplayTagModal(true);
      }
    } else if (actionType === "send-to-user") {
      setShowGetRecipientEmailModal(true);
    }
    setShowChooseHowToShareModal(false);
  };

  const handleSubmitRecipientEmail = async (email: string) => {
    if (backupToShare && backupToShare.tag) {
      onShareBackup(backupToShare, email, backupToShare.tag);
    }
    setShowGetRecipientEmailModal(false);
  };

  const tooltipItems = [
    { id: 1, name: t('download'), icon: <IconDownload size={24} />, onClick: onDownloadBackup },
    { id: 2, name: t('share'), icon: <IconShare size={24} />, onClick: handleShareBackup },
    { id: 3, name: t('delete'), icon: <IconTrash size={24} />, onClick: handleDeleteBackup },
  ];

  if (isRTL) {
    tooltipItems.reverse();
  }

  const renderFieldWithSpecificUnknown = (label: string, value: string | number | null | undefined, unknownTranslation: string) => {
    if (value === null || value === undefined) {
      return (
        <div>
          <span className="font-semibold">{unknownTranslation}</span>
        </div>
      );
    }
    const safeValue = value === undefined ? null : value;
    if (isRTL) {
      return (
        <div className="flex flex-row-reverse">
          <span className="font-semibold">{label}</span>
          <span className="mx-1">:</span>
          <span dir={isRTLCheck(String(safeValue)) ? 'rtl' : 'ltr'}>
            {safeValue ?? t('unknown')}
          </span>
        </div>
      );
    } else {
      return (
        <div>
          <span className="font-semibold">{label}:&nbsp;</span>
          <span dir={isRTLCheck(String(safeValue)) ? 'rtl' : 'ltr'}>
            {safeValue ?? t('unknown')}
          </span>
        </div>
      );
    }
  };

  const renderFieldWithGenericUnknown = (label: string, value: string | number | null | undefined, isSize: boolean = false) => {
    if (value === null || value === undefined) {
      return (
        <div>
          <span className="font-semibold">{label}:&nbsp;</span>
          <span>{t('unknown')}</span>
        </div>
      );
    }
    const safeValue = value === undefined ? null : value;
    if (isRTL) {
      return (
        <div className="flex flex-row-reverse">
          <span className="font-semibold">{label}</span>
          <span className="mx-1">:</span>
          {isSize ? (
            <span dir="ltr">{safeValue ?? t('unknown')}</span>
          ) : (
            <span dir={isRTLCheck(String(safeValue)) ? 'rtl' : 'ltr'}>
              {safeValue ?? t('unknown')}
            </span>
          )}
        </div>
      );
    } else {
      return (
        <div>
          <span className="font-semibold">{label}:&nbsp;</span>
          <span dir={isSize ? 'ltr' : isRTLCheck(String(safeValue)) ? 'rtl' : 'ltr'}>
            {safeValue ?? t('unknown')}
          </span>
        </div>
      );
    }
  };

  return (
    <div className="received-backups w-full">
      <div className="space-y-4">
        {backups.map((backup, index) => (
          <HighlightEffect key={backup.id}>
            <div className="p-4 rounded-lg border border-[var(--lightened-background-adjacent-color)] bg-[var(--card-background)] relative">
              <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {renderFieldWithSpecificUnknown(t('name'), backup.decryptedResult?.decryptedFilename, t('unknown-name'))}
                {renderFieldWithSpecificUnknown(t('description'), backup.decryptedResult?.decryptedDescription, t('no-description'))}
                {renderFieldWithSpecificUnknown(t('upload-date'), backup.createdAt ? formatDate(backup.createdAt, i18n.language) : null, t('unknown-upload-date'))}
                {renderFieldWithGenericUnknown(t('size'), backup.size && backup.size >= 1 ? generateFileSizeString(backup.size) : null, true)}
                {renderFieldWithGenericUnknown(t('size-of-encrypted-backup'), backup.encryptedSize && backup.encryptedSize >= 1 ? generateFileSizeString(backup.encryptedSize) : null, true)}
                {renderFieldWithSpecificUnknown(t('downloads'), backup.downloads, t('unknown-downloads'))}
                {renderFieldWithSpecificUnknown(t('owner'), backup.owner, t('unknown'))}
                {renderFieldWithSpecificUnknown(t('sender'), backup.sender, t('unknown'))}
              </div>
              {backupStates[index]?.length > 0 && (
                <div style={{ width: '100%', marginTop: '1.25rem' }}>
                  <div style={{ width: '100%', direction: isRTL ? 'rtl' : 'ltr' }}>
                    <label className="text-[var(--foreground)]" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                      <span className="font-semibold" dir={isRTLCheck(t("backup-state")) ? 'rtl' : 'ltr'}>
                        {t("backup-state")}:
                      </span>
                    </label>
                  </div>
                  <div style={{ overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#151419 #151419', marginTop: '0.75rem' }}>
                    {backupStates[index]?.map((message, msgIndex) => (
                      <div key={msgIndex} dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <span style={{ margin: '4px', ...(isRTL ? { transform: 'scaleX(-1)' } : {}) }}>
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
              <div className="flex justify-center mt-4">
                <AnimatedTooltip items={tooltipItems.map(item => ({ ...item, onClick: () => item.onClick(backup) }))} isRTL={isRTL} />
              </div>
            </div>
          </HighlightEffect>
        ))}
      </div>
      {showDeleteBackupModal && (
        <ConfirmationPopUp
          showConfirmPopUp={showDeleteBackupModal}
          onConfirm={() => confirmDeleteBackup(true)}
          onCancel={() => confirmDeleteBackup(false)}
          confirmText={t('yes-button-inscription')}
          cancelText={t('no-button-inscription')}
          messageText={t('are-you-sure-you-want-to-delete-this-backup')}
          secondLineText={t('this-cant-be-undone')}
          backgroundColorFirst="var(--pattern-white)"
          backgroundColorSecond="var(--card-background)"
          borderColor="var(--lightened-background-adjacent-color)"
          generalBorderRadius="none"
          borderWidth={1}
          modalWidth="auto"
          modalHeight="auto"
          modalPadding="2rem"
          marginAroundModal="0"
          mirrorButtons={isRTL}
          textSize={24}
        />
      )}
      {showChooseHowToShareModal && backupToShare && (
        <ChooseHowToShareBackupModal
          onClose={() => setShowChooseHowToShareModal(false)}
          onAction={handleAction}
          projectId={backupToShare.localIdentifier}
          backupId={backupToShare.id}
        />
      )}
      {showDisplayTagModal && generatedTag && (
        <DisplayShareableTagForBackup
          shareableTag={generatedTag}
          onClose={() => setShowDisplayTagModal(false)}
        />
      )}
      {showGetRecipientEmailModal && (
        <GetRecipientEmail
          onClose={() => setShowGetRecipientEmailModal(false)}
          onSubmit={handleSubmitRecipientEmail}
        />
      )}
    </div>
  );
};

export default ReceivedBackupsComponent;
