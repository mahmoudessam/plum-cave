"use client";

import React, { useState, useRef, useEffect } from 'react';
import { IconDownload, IconShare, IconListDetails, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import HalomotButton from '@/components/HalomotButton/HalomotButton';
import ConfirmationPopUp from '@/components/ConfirmationPopUp/ConfirmationPopUp';
import type { Project, Backup } from '../types';
import { generateFileSizeString, formatDate, isRTLCheck } from "@/components/utils";

interface BackupTableProps {
  project: Project;
  onDeleteBackup: (projectId: string, backupId: string) => void;
  onDownloadBackup: (backupId: string) => void;
  onShareBackup: (projectId: string, backupId: string) => void;
  onViewBackupDetails: (projectId: string, backupId: string) => void;
  onCreateNewBackup: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void; // Added callback for delete project
}

const BackupTable: React.FC<BackupTableProps> = ({
  project,
  onDeleteBackup,
  onDownloadBackup,
  onShareBackup,
  onViewBackupDetails,
  onCreateNewBackup,
  onDeleteProject // Added callback for delete project
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showDeleteBackupModal, setShowDeleteBackupModal] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [backupIdToDelete, setBackupIdToDelete] = useState<string | null>(null);
  const descriptionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    Object.keys(descriptionRefs.current).forEach((id) => {
      const el = descriptionRefs.current[id];
      if (el) {
        gsap.to(el, {
          duration: 0.3,
          height: expandedRow === id ? 'auto' : 0,
          opacity: expandedRow === id ? 1 : 0,
          ease: 'power2.inOut',
          onStart: () => {
            if (expandedRow === id) {
              el.style.display = 'block';
            }
          },
          onComplete: () => {
            if (expandedRow !== id) {
              el.style.display = 'none';
            }
          }
        });
      }
    });
  }, [expandedRow]);

  const handleRowClick = (backupId: string) => {
    setExpandedRow(prevId => prevId === backupId ? null : backupId);
  };

  const isBackupIntegrityValid = (backup: Backup): boolean => {
    const { privateData, decryptedResult, encryptedData } = backup;
    const privateDataIntegrity = privateData.randomlyGeneratedFileKey.integrity && privateData.fileSalt.integrity && privateData.metadataSalt.integrity && privateData.encryptedTag.integrity;
    const metadataIntegrity = decryptedResult?.metadataIntegrity !== null ? decryptedResult?.metadataIntegrity : decryptedResult?.filenameIntegrity;
    const decryptedResultIntegrity = !!decryptedResult?.filenameIntegrity && (decryptedResult?.descriptionIntegrity === null || !!decryptedResult.descriptionIntegrity) && !!metadataIntegrity;
    return !!privateDataIntegrity && !!decryptedResultIntegrity;
  };

  const isDownloadDisabled = (backup: Backup): boolean => {
    const { privateData } = backup;
    return privateData.randomlyGeneratedFileKey.status === "absent" || privateData.fileSalt.status === "absent";
  };

  const handleDeleteBackup = (projectId: string, backupId: string) => {
    setBackupIdToDelete(backupId);
    setShowDeleteBackupModal(true);
  };

  const handleDeleteProject = () => {
    setShowDeleteProjectModal(true);
  };

  const confirmDeleteBackup = (confirmed: boolean) => {
    if (confirmed && backupIdToDelete && project.id) {
      onDeleteBackup(project.id, backupIdToDelete);
    }
    setShowDeleteBackupModal(false);
  };

  const confirmDeleteProject = (confirmed: boolean) => {
    if (confirmed && project.id) {
      onDeleteProject(project.id);
    }
    setShowDeleteProjectModal(false);
  };

  return (
    <div className={`overflow-x-auto ${isRTL ? 'rtl' : 'ltr'} relative`} style={{ direction: 'ltr' }}>
      <div className={`mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p style={{ direction: isRTLCheck(project.name) ? 'rtl' : 'ltr' }} className={`text-3xl text-[var(--foreground)] ${!project.integrity ? 'text-[var(--theme-red-color)] italic' : ''}`}>
          {project.name}
        </p>
        {project.description && (
          <p style={{ direction: isRTLCheck(project.description) ? 'rtl' : 'ltr' }} className={`text-[1rem] text-[var(--foreground)] mt-4 ${!project.integrity ? 'text-[var(--theme-red-color)] italic' : ''}`}>
            {project.description}
          </p>
        )}
        {!project.integrity && (
          <p style={{ direction: isRTLCheck(t('metadata-integrity-compromised')) ? 'rtl' : 'ltr' }} className="text-[1rem] text-[var(--theme-red-color)] mt-4">
            {t('metadata-integrity-compromised')}
          </p>
        )}
        {project.createdAt && (
          <p style={{ direction: isRTLCheck(formatDate(project.createdAt, i18n.language)) ? 'rtl' : 'ltr' }} className={`text-[1rem] text-[var(--foreground)] mt-4 ${!project.integrity ? 'text-[var(--theme-red-color)] italic' : ''}`}>
            {t('creation-date')}: {formatDate(project.createdAt, i18n.language)}
          </p>
        )}
      </div>
      <div className={`mb-4 pt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className="text-[20px] text-[var(--foreground)]">{t('backups')}</p>
      </div>
      <table className="min-w-full border-collapse table-fixed border border-[var(--table-separator-color)]">
        <colgroup>
          {isRTL ? (
            <>
              <col style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }} />
              <col style={{ width: '240px', maxWidth: '240px' }} />
              <col style={{ width: '16%', maxWidth: '217.6px' }} />
              <col style={{ width: '16%', maxWidth: '217.6px' }} />
              <col style={{ width: 'auto' }} />
            </>
          ) : (
            <>
              <col style={{ width: 'auto' }} />
              <col style={{ width: '16%', maxWidth: '217.6px' }} />
              <col style={{ width: '16%', maxWidth: '217.6px' }} />
              <col style={{ width: '240px', maxWidth: '240px' }} />
              <col style={{ width: '140px', minWidth: '140px', maxWidth: '140px' }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr className="bg-[var(--card-background)] text-white">
            {isRTL ? (
              <>
                <th className={`px-4 py-2 text-right resize-x overflow-hidden border border-[var(--table-separator-color)]`}></th>
                <th className={`px-4 py-2 text-right resize-x overflow-hidden border border-[var(--table-separator-color)]`}>{t('size')}</th>
                <th className={`px-4 py-2 text-right resize-x overflow-hidden border border-[var(--table-separator-color)]`}>{t('upload-date')}</th>
                <th className={`px-4 py-2 text-right resize-x overflow-hidden border border-[var(--table-separator-color)]`}>{t('access')}</th>
                <th className={`px-4 py-2 text-right resize-x overflow-hidden border border-[var(--table-separator-color)]`}>{t('name')}</th>
              </>
            ) : (
              <>
                <th className={`px-4 py-2 text-left resize-x overflow-hidden border border-[var(--table-separator-color)]`}>{t('name')}</th>
                <th className={`px-4 py-2 text-left resize-x overflow-hidden border border-[var(--table-separator-color)]`}>{t('access')}</th>
                <th className={`px-4 py-2 text-left resize-x overflow-hidden border border-[var(--table-separator-color)]`}>{t('upload-date')}</th>
                <th className={`px-4 py-2 text-left resize-x overflow-hidden border border-[var(--table-separator-color)]`}>{t('size')}</th>
                <th className={`px-4 py-2 text-left overflow-hidden border border-[var(--table-separator-color)]`}></th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {project.backups.map((backup, index) => (
            <React.Fragment key={backup.id}>
              <tr
                className={` ${index % 2 === 0 ? 'bg-[var(--background-adjacent-color)]' : 'bg-[var(--lightened-background-adjacent-color)]'} border-x border-t border-[var(--table-separator-color)] ${hoveredRow === backup.id ? 'bg-[var(--navbar-background)]' : ''} ${expandedRow === backup.id ? 'bg-[var(--navbar-background)]' : ''} transition-all duration-300 cursor-pointer `}
                onMouseEnter={() => setHoveredRow(backup.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => handleRowClick(backup.id)}
                style={{
                  borderRight: isRTL ? `3px solid ${isBackupIntegrityValid(backup) ? 'var(--theme-green-color)' : 'var(--theme-red-color)'}` : 'none',
                  borderLeft: !isRTL ? `3px solid ${isBackupIntegrityValid(backup) ? 'var(--theme-green-color)' : 'var(--theme-red-color)'}` : 'none',
                }}
              >
                {isRTL ? (
                  <>
                    <td className="px-4 py-2">
                      <div style={{ transform: isRTL ? 'scaleX(-1)' : undefined, }} className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} space-x-2 ${isRTL ? "space-x-reverse" : ""} justify-end`}>
                        <IconTrash
                          className="hover:text-[var(--first-theme-color)] transition-colors duration-300 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBackup(project.id, backup.id);
                          }}
                        />
                        <IconListDetails
                          className="hover:text-[var(--first-theme-color)] transition-colors duration-300 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewBackupDetails(project.id, backup.id);
                          }}
                        />
                        <IconShare
                          className="hover:text-[var(--first-theme-color)] transition-colors duration-300 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareBackup(project.id, backup.id);
                          }}
                        />
                        <IconDownload
                          className={`${isDownloadDisabled(backup) ? 'text-[var(--refresh-inscription-color)] opacity-50 cursor-not-allowed' : 'hover:text-[var(--first-theme-color)] transition-colors duration-300 cursor-pointer'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDownloadDisabled(backup)) {
                              onDownloadBackup(backup.id);
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 truncate" style={{ direction: "ltr", textAlign: isRTL ? "right" : "left" }}>
                      {backup.size && backup.size >= 1 ? generateFileSizeString(backup.size) : t('unknown')}
                    </td>
                    <td className="px-4 py-2 truncate" style={{ direction: isRTLCheck(backup.createdAt ? formatDate(backup.createdAt, i18n.language) : t("unknown")) ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left" }}>
                      {backup.createdAt ? formatDate(backup.createdAt, i18n.language) : t("unknown")}
                    </td>
                    <td className="px-4 py-2 truncate" style={{ direction: isRTLCheck(backup.isPublic ? t("public") : t("private")) ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left" }}>
                      {backup.isPublic ? t("public") : t("private")}
                    </td>
                    <td className="px-4 py-2 truncate" style={{ direction: isRTLCheck(backup.decryptedResult?.decryptedFilename ?? t("name-is-absent")) ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left" }}>
                      {backup.decryptedResult?.decryptedFilename ?? t("name-is-absent")}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 truncate" style={{ direction: isRTLCheck(backup.decryptedResult?.decryptedFilename ?? t("name-is-absent")) ? "rtl" : "ltr", textAlign: isRTLCheck(backup.decryptedResult?.decryptedFilename ?? t("name-is-absent")) ? "right" : "left" }}>
                      {backup.decryptedResult?.decryptedFilename ?? t("name-is-absent")}
                    </td>
                    <td className="px-4 py-2 truncate" style={{ direction: isRTLCheck(backup.isPublic ? t("public") : t("private")) ? "rtl" : "ltr", textAlign: isRTLCheck(backup.isPublic ? t("public") : t("private")) ? "right" : "left" }}>
                      {backup.isPublic ? t("public") : t("private")}
                    </td>
                    <td className="px-4 py-2 truncate" style={{ direction: isRTLCheck(backup.createdAt ? formatDate(backup.createdAt, i18n.language) : t("unknown")) ? "rtl" : "ltr", textAlign: isRTLCheck(backup.createdAt ? formatDate(backup.createdAt, i18n.language) : t("unknown")) ? "right" : "left" }}>
                      {backup.createdAt ? formatDate(backup.createdAt, i18n.language) : t("unknown")}
                    </td>
                    <td className="px-4 py-2 truncate" style={{ direction: "ltr", textAlign: isRTL ? "right" : "left" }}>
                      {backup.size && backup.size >= 1 ? generateFileSizeString(backup.size) : t('unknown')}
                    </td>
                    <td className="px-4 py-2">
                      <div className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} space-x-2 ${isRTL ? "space-x-reverse" : ""} justify-end`}>
                        <IconDownload
                          className={`${isDownloadDisabled(backup) ? 'text-[var(--refresh-inscription-color)] opacity-50 cursor-not-allowed' : 'hover:text-[var(--first-theme-color)] transition-colors duration-300 cursor-pointer'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDownloadDisabled(backup)) {
                              onDownloadBackup(backup.id);
                            }
                          }}
                        />
                        <IconShare
                          className="hover:text-[var(--first-theme-color)] transition-colors duration-300 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareBackup(project.id, backup.id);
                          }}
                        />
                        <IconListDetails
                          className="hover:text-[var(--first-theme-color)] transition-colors duration-300 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewBackupDetails(project.id, backup.id);
                          }}
                        />
                        <IconTrash
                          className="hover:text-[var(--first-theme-color)] transition-colors duration-300 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBackup(project.id, backup.id);
                          }}
                        />
                      </div>
                    </td>
                  </>
                )}
              </tr>
              <tr className={`bg-[var(--navbar-background)] border-x ${expandedRow === backup.id ? '' : 'hidden'}`} style={{ borderRight: isRTL ? `3px solid ${isBackupIntegrityValid(backup) ? 'var(--theme-green-color)' : 'var(--theme-red-color)'}` : 'none', borderLeft: !isRTL ? `3px solid ${isBackupIntegrityValid(backup) ? 'var(--theme-green-color)' : 'var(--theme-red-color)'}` : 'none' }}>
                <td colSpan={5} className="px-4 py-0">
                  <div ref={(el) => { if (el) descriptionRefs.current[backup.id] = el; }} className="text-[var(--foreground)] opacity-0 h-0 overflow-hidden mt-1 mb-3" style={{ display: 'none', direction: isRTLCheck(backup.decryptedResult?.decryptedDescription ?? t('no-description')) ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}>
                    {backup.decryptedResult?.decryptedDescription ?? t('no-description')}
                  </div>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'} mt-6`}>
        <HalomotButton
          text={t('new-backup')}
          onClick={() => onCreateNewBackup(project.id)}
          gradient={isRTL ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'}
        />
      </div>
      <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'} mt-6`} style={{ marginTop: '24px' }}>
        <HalomotButton
          text={t('delete-project')}
          onClick={handleDeleteProject}
          gradient={
            i18n.language === 'he'
              ? 'linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))'
              : 'linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))'
          }
        />
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
      {showDeleteProjectModal && (
        <ConfirmationPopUp
          showConfirmPopUp={showDeleteProjectModal}
          onConfirm={() => confirmDeleteProject(true)}
          onCancel={() => confirmDeleteProject(false)}
          confirmText={t('yes-button-inscription')}
          cancelText={t('no-button-inscription')}
          messageText={t('are-you-sure-you-want-to-delete-this-project')}
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
    </div>
  );
};

export default BackupTable;
