"use client"
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import UnfoldingSidebar from '@/components/UnfoldingSidebar/UnfoldingSidebar';
import FancyNavbar from '@/components/FancyNavbar/FancyNavbar';
import LanguageSelector from "@/components/LanguageSelector/LanguageSelector";
import { IconBorderRightPlus, IconFoldDown, IconLogout, IconLogout2 } from '@tabler/icons-react';
import LanguageIcon from '@/components/LanguageIcon';
import DashboardContent from './DashboardContent';
import BackupTable from '../BackupTable/BackupTable';
import ReceivedBackupsComponent from './ReceivedBackupsComponent';
import SentBackupsComponent from './SentBackupsComponent';
import FileCatcher from "@/components/FileCatcher/FileCatcher";
import useStore from '@/store/store';
import { db, auth } from '@/app/lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, serverTimestamp, getFirestore } from "firebase/firestore";
import Swal from 'sweetalert2'; // Import SweetAlert2
import { silentlyEncryptDataWithTwoCiphersCBC, silentlyEncryptDataWithTwoCiphersCBCnoPadding, encryptPrivateRecordTagWithTwoCiphersCBC, decryptFieldValueWithTwoCiphersCBC, decryptFieldValueWithTwoCiphersCBCnoPadding, CheckRecordIntegrity, decryptStringWithTwoCiphersCBC, deriveBytesUsingArgon2id, CheckBackupIntegrity } from '@/app/cryptographicPrimitives/twoCiphersSilentMode';
import { toast } from "react-toastify";
import type { Project, Backup, SharedBackup } from '../types';
import ConfirmationPopUp from '@/components/ConfirmationPopUp/ConfirmationPopUp'
import RefreshConfirmationPopUp from '@/components/ConfirmationPopUp/RefreshConfirmationPopUp'
import FileEncrypter from '@/components/FileEncrypter/FileEncrypter'
import FileDecrypter from '@/components/FileEncrypter/FileDecrypter'
import DecryptModal from '@/components/FileEncrypter/DecryptModal';
import NewProjectModal from '@/components/NewProjectModal/NewProjectModal'
import { generateFileSizeString, base64ToUint8Array, encodeTag, decodeTag } from "@/components/utils"
import useBackupDownloader from '@/components/BackupDownloader/BackupDownloader';
import DownloadFileModal from '@/components/DownloadFileModal/DownloadFileModal';
import ChooseHowToShareBackupModal from "./ChooseHowToShareBackupModal";
import TagGenerator from "@/components/TagGenerator/TagGenerator";
import DisplayShareableTagForBackup from "@/components/Dashboard/DisplayShareableTagForBackup"
import GetRecipientEmail from "@/components/Dashboard/GetRecipientEmail"
import { MlKem1024 } from 'mlkem';
import HalomotButton from '@/components/HalomotButton/HalomotButton';
import { fetchAndDecryptBackupById } from '@/components/DecryptMetadataUsingBackupTag/DecryptMetadataUsingBackupTag';
import FileDecrypterForSharedBackups from '@/components/FileEncrypter/FileDecrypterForSharedBackups'
import { gsap } from "gsap";

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

interface DashboardProps {
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const { setIsLoggedIn, setMasterKey, setIterations } = useStore.getState();
  const { iterations, masterKey } = useStore();
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const [userEmail, setEmail] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [selectedFileForFileEncrypter, setSelectedFileForFileEncrypter] = useState<File | null>(null);
  const [isEncrypterOpen, setIsEncrypterOpen] = useState(false);
  const [isFileCatcherOpen, setIsFileCatcherOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);

  const totalProjects = projects.length.toString();
  const totalBackups = projects.reduce((sum, project) => sum + project.backups.length, 0).toString();
  const [totalBackupSize, setTotalBackupSize] = useState<string>("0 bytes");
  const [totalReceivedBackups, setTotalReceivedBackups] = useState<string>("--");

  const [currentBackupDetails, setCurrentBackupDetails] = useState<Backup | null>(null);
  const [isBackupDetailsModalOpen, setIsBackupDetailsModalOpen] = useState(false);  

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { downloadBackupChunks } = useBackupDownloader();
  const [decryptionProps, setDecryptionProps] = useState<FileDecrypterProps | null>(null);
  const [isDecryptionModalOpen, setIsDecryptionModalOpen] = useState(false);
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

  const [downloaderVisible, setDownloaderVisible] = useState(false);
  const [isChooseHowToShareBackupModalOpen, setIsChooseHowToShareBackupModalOpen] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedBackupId, setSelectedBackupId] = useState<string>("");
  const [showShareConfirmationModal, setShowShareConfirmationModal] = useState<boolean>(false); // Confirmation modal state
  const [generatedTag, setGeneratedTag] = useState<string | null>(null); // State to store the generated tag
  const [showDisplayTagModal, setShowDisplayTagModal] = useState<boolean>(false); // State to control modal visibility
  const [showGetRecipientEmailModal, setShowGetRecipientEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [showSendConfirmationModal, setShowSendConfirmationModal] = useState<boolean>(false);
  const [isBackupExtractionPerformed, setIsBackupExtractionPerformed] = useState(false);
  const [decryptionPropsForSharedBackup, setDecryptionPropsForSharedBackup] = useState<FileDecrypterForSharedBackupsProps | null>(null);
  const [isDecryptModalForSharedBackup, setIsDecryptModalForSharedBackup] = useState(false);
  const [downloaderForSharedBackup, setDownloaderForSharedBackup] = useState(false);
  const [refreshModalShown, setRefreshModalShown] = useState(false);
  const [isRefreshingReceivedBackups, setIsRefreshingReceivedBackups] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.inOut" });
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true; // Add a flag to prevent resetting during unmounts or unnecessary updates

    const totalSizeInBytes = projects.reduce((totalSize, project) => {
      return (
        totalSize +
        project.backups.reduce((backupSize, backup) => {
          // Only add the size if it's valid (not -1)
          return backup.size !== -1 ? backupSize + (backup.size ?? 0) : backupSize;
        }, 0)
      );
    }, 0);

    if (isMounted) {
      setTotalBackupSize(generateFileSizeString(totalSizeInBytes));
    }

    return () => {
      isMounted = false; // Cleanup function to avoid unnecessary updates
    };
  }, [projects]);

  const [receivedBackups, setReceivedBackups] = useState<SharedBackup[]>([]);
  const [sentBackups, setSentBackups] = useState<SharedBackup[]>([]);

  useEffect(() => {
    const singleton = SingletonEffect.getInstance();
    singleton.runEffect(async () => {
      try {
        // Validate cryptographic values
        validateCryptographicValues(masterKey, iterations);
        await new Promise(resolve => setTimeout(resolve, 24));
  
        // Ensure user is authenticated
        const user = auth.currentUser;
        if (!user) {
          await new Promise(resolve => setTimeout(resolve, 50));
          await show_authentication_error();
          throw new Error("User not authenticated");
        }

        setProjects([]);
  
        // Show loading modal
        Swal.fire({
          title: t("fetching-projects"),
          html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>`,
          color: "var(--foreground)",
          background: "var(--card-background)",
          width: 640,
          allowOutsideClick: false,
          customClass: { popup: "swal-custom-popup" },
          didOpen: () => { Swal.showLoading(); },
        });
  
        // Fetch projects from Firebase
        const projectsRef = collection(db, `data/${user.email}/private/encrypted/projectInfo`);
        const querySnapshot = await getDocs(projectsRef);
        let fetchedProjects: Project[] = [];
        const cutIterations = parseInt((iterations / 10).toString(), 10);
        const derivedKey = masterKey.slice(114);
  
        for (const [, doc] of querySnapshot.docs.entries()) {
  
          const data = doc.data();
          let decryptedName = t("corrupt-project-name");
          let decryptedDescription: string | undefined = undefined;
          let integrity = true;
  
          // ===== NAME INTEGRITY CHECK =====
          try {
            if (!data.name || data.name.trim() === "") {
              decryptedName = t("missing-project-name");
              integrity = false;
            } else {
              const decodedName = base64ToUint8Array(data.name);
              if (decodedName.length % 16 !== 0) {
                decryptedName = t("corrupt-project-name");
                integrity = false;
              } else {
                const [decryptedNameArray, nameIntegrity] = 
                  await decryptFieldValueWithTwoCiphersCBC(decodedName, derivedKey, cutIterations);
                decryptedName = new TextDecoder().decode(decryptedNameArray);
                integrity = nameIntegrity;
              }
            }
          } catch (error) {
            console.error(`Error decrypting project name for project ${doc.id}:`, error);
            decryptedName = t("corrupt-project-name");
            integrity = false;
          }
  
          // ===== DESCRIPTION HANDLING =====
          try {
            if (data.description && data.description.trim() !== "" && data.description !== "none") {
              const decodedDescription = base64ToUint8Array(data.description);
              if (decodedDescription.length % 16 !== 0) {
                decryptedDescription = t("corrupt-description");
                integrity = false;
              } else {
                const [decryptedDescriptionArray, descriptionIntegrity] = 
                  await decryptFieldValueWithTwoCiphersCBC(decodedDescription, derivedKey, cutIterations);
                decryptedDescription = new TextDecoder().decode(decryptedDescriptionArray);
                integrity = integrity && descriptionIntegrity;
              }
            } else if (!data.description) {
              // Absent (not "none") - mark as invalid
              decryptedDescription = t("missing-description");
              integrity = false;
            }
            // Else: "none" is valid, leave description undefined
          } catch (error) {
            console.error(`Error decrypting project description for project ${doc.id}:`, error);
            decryptedDescription = t("corrupt-description");
            integrity = false;
          }
  
          // ===== TAG INTEGRITY CHECK =====
          try {
            if (data.tag && data.tag.trim() !== "" && data.tag !== "none") {
              const decodedTag = base64ToUint8Array(data.tag);
              if (decodedTag.length % 16 === 0) {
                // Only verify tag if we have both name and description
                if (data.description !== "none" && decryptedDescription) {
                  const combinedData = new Uint8Array(
                    new TextEncoder().encode(decryptedName).length + 
                    new TextEncoder().encode(decryptedDescription).length
                  );
                  combinedData.set(new TextEncoder().encode(decryptedName), 0);
                  combinedData.set(new TextEncoder().encode(decryptedDescription), new TextEncoder().encode(decryptedName).length);
                  
                  const isTagValid = await CheckRecordIntegrity(decodedTag, derivedKey, cutIterations, combinedData);
                  integrity = integrity && isTagValid;
                }
              } else {
                integrity = false;
              }
            } else if (!data.tag && data.description !== "none") {
              // Tag is absent but description exists (not "none") - invalid
              integrity = false;
            }
            // Else: "none" is valid when description is also "none"
          } catch (error) {
            console.error(`Error verifying project tag for project ${doc.id}:`, error);
            integrity = false;
          }
  
          // ===== FINAL INTEGRITY RULES =====
          // Case 1: Both description and tag are "none" - only check name integrity
          if (data.description === "none" && data.tag === "none") {
            // integrity already reflects name integrity at this point
            decryptedDescription = undefined;
          }
          // Case 2: Any field is missing (not "none") - integrity is false
          else if (!data.name || !data.description || !data.tag) {
            integrity = false;
          }
  
          // ===== CREATE PROJECT OBJECT =====
          const createdAtTimestamp = data.createdAt?.toDate() || new Date();
          const newProject: Project = {
            id: doc.id,
            name: decryptedName,
            description: decryptedDescription,
            integrity,
            createdAt: createdAtTimestamp,
            backups: [],
          };
  
          fetchedProjects.push(newProject);
        }
  
        setTimeout(() => setProjects(fetchedProjects), 100); 

        fetchedProjects = await fetchPrivatePartOfBackupsForProjects(fetchedProjects);
  
        // Fetch metadata for all backups
        fetchedProjects = await fetchMetadataForAllBackups(fetchedProjects);
  
        // Set final processed projects to state with a delay
        setTimeout(() => setProjects(fetchedProjects), 100);
        Swal.close();
      } catch (error) {
        console.error("Error fetching or decrypting projects:", error);
        const errorMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
        showErrorModal(errorMessage);
      } finally {
        SingletonEffect.resetInstance();
      }
    });
  
    return () => {
      // Cleanup logic if necessary
    };
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email); // Set the user's email
      } else {
        setEmail(null); // User is signed out
      }
    });

    return () => unsubscribe(); // Clean up the listener
  }, []);

  useEffect(() => {
    if (isRefreshingReceivedBackups) {
      setTotalReceivedBackups(receivedBackups.length.toString());
    }
  }, [receivedBackups, isRefreshingReceivedBackups]);  
  
  const fetchPrivatePartOfBackupsForProjects = async (projects: Project[]): Promise<Project[]> => {
    try {
        validateCryptographicValues(masterKey, iterations);
        await new Promise((resolve) => setTimeout(resolve, 24)); // Simulate delay
        const user = auth.currentUser;
        if (!user) {
            await new Promise((resolve) => setTimeout(resolve, 50));
            await show_authentication_error();
            throw new Error("User not authenticated");
        }
        Swal.update({
            title: t("processing-backups"),
            html: `
                <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                  ${t("step_n_of_m", { currentStep: 1, totalSteps: 2 })}
                </p>
                <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                    ${t("fetching-and-decrypting-data-necessary-for-decryption-backups")}
                </p>
                <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please-be-patient-this-can-take-a-while")}</p>
            `,
            allowOutsideClick: false,
            showCloseButton: false,
            showCancelButton: false,
            customClass: { popup: "swal-custom-popup" },
        });
        Swal.showLoading();

        const userEmail = user.email!;
        const cutIterations = parseInt((iterations / 3).toString(), 10);
        const updatedProjects = [...projects];
        let projectIndex = 0;
        const totalProjects = updatedProjects.length;

        for (const project of updatedProjects) {
            projectIndex++;
            const backupsRef = collection(db, `data/${userEmail}/private/encrypted/projectInfo/${project.id}/backups`);
            const querySnapshot = await getDocs(backupsRef);
            const fetchedBackups: Backup[] = [];
            let backupIndex = 0;
            const totalBackups = querySnapshot.docs.length;

            for (const doc of querySnapshot.docs) {
                backupIndex++;
                await new Promise(resolve => setTimeout(resolve, 24));
                Swal.update({
                    title: t("processing-backups"),
                    html: `
                        <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                          ${t("step_n_of_m", { currentStep: 1, totalSteps: 2 })}
                        </p>
                        <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                            ${t("fetching-and-decrypting-data-necessary-for-decryption-backups")}
                        </p>
                        <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                            ${t("project_n_of_m_backup_n_of_m", { currentProjectIndex: projectIndex, totalProjects, currentBackupIndex: backupIndex, totalBackups })}
                        </p>
                        <p style="margin-bottom:5px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
                    `,
                    allowOutsideClick: false,
                    showCloseButton: false,
                    showConfirmButton: false,
                    showCancelButton: false,
                    customClass: { popup: "swal-custom-popup" },
                });

                const data = doc.data();
                const privateData: Backup["privateData"] = {
                    randomlyGeneratedFileKey: { value: null, integrity: null, status: "absent" },
                    fileSalt: { value: null, integrity: null, status: "absent" },
                    metadataSalt: { value: null, integrity: null, status: "absent" },
                    encryptedTag: { value: null, integrity: null, status: "absent" },
                };

                if (data.randomlyGeneratedFileKey) {
                    const decodedKey = base64ToUint8Array(data.randomlyGeneratedFileKey);
                    if (decodedKey.length % 16 === 0) {
                        privateData.randomlyGeneratedFileKey.value = decodedKey;
                        privateData.randomlyGeneratedFileKey.status = "valid";
                        const [decryptedKey, keyIntegrity] = await decryptFieldValueWithTwoCiphersCBCnoPadding(decodedKey, masterKey, cutIterations);
                        privateData.randomlyGeneratedFileKey.value = decryptedKey;
                        privateData.randomlyGeneratedFileKey.integrity = keyIntegrity;
                    } else {
                        privateData.randomlyGeneratedFileKey.status = "corrupted";
                        privateData.randomlyGeneratedFileKey.integrity = false;
                    }
                }
                if (data.fileSalt) {
                    const decodedSalt = base64ToUint8Array(data.fileSalt);
                    if (decodedSalt.length % 16 === 0) {
                        privateData.fileSalt.value = decodedSalt;
                        privateData.fileSalt.status = "valid";
                        const [decryptedSalt, saltIntegrity] = await decryptFieldValueWithTwoCiphersCBCnoPadding(decodedSalt, masterKey, cutIterations);
                        privateData.fileSalt.value = decryptedSalt;
                        privateData.fileSalt.integrity = saltIntegrity;
                    } else {
                        privateData.fileSalt.status = "corrupted";
                        privateData.fileSalt.integrity = false;
                    }
                }
                if (data.metadataSalt) {
                    const decodedMetadataSalt = base64ToUint8Array(data.metadataSalt);
                    if (decodedMetadataSalt.length % 16 === 0) {
                        privateData.metadataSalt.value = decodedMetadataSalt;
                        privateData.metadataSalt.status = "valid";
                        const [decryptedMetadataSalt, metadataIntegrity] = await decryptFieldValueWithTwoCiphersCBCnoPadding(decodedMetadataSalt, masterKey, cutIterations);
                        privateData.metadataSalt.value = decryptedMetadataSalt;
                        privateData.metadataSalt.integrity = metadataIntegrity;
                    } else {
                        privateData.metadataSalt.status = "corrupted";
                        privateData.metadataSalt.integrity = false;
                    }
                }
                if (data.encryptedTag) {
                    const decodedTag = base64ToUint8Array(data.encryptedTag);
                    if (decodedTag.length % 16 === 0) {
                        privateData.encryptedTag.value = decodedTag;
                        privateData.encryptedTag.status = "valid";
                        try {
                            const hasMissingOrCorruptedValues = !privateData.randomlyGeneratedFileKey.value || privateData.randomlyGeneratedFileKey.integrity === false || !privateData.fileSalt.value || privateData.fileSalt.integrity === false || !privateData.metadataSalt.value || privateData.metadataSalt.integrity === false;
                            if (hasMissingOrCorruptedValues) {
                                privateData.encryptedTag.integrity = false;
                            } else {
                                const combinedData = new Uint8Array(privateData.randomlyGeneratedFileKey.value!.length + privateData.fileSalt.value!.length + privateData.metadataSalt.value!.length);
                                combinedData.set(privateData.randomlyGeneratedFileKey.value!, 0);
                                combinedData.set(privateData.fileSalt.value!, privateData.randomlyGeneratedFileKey.value!.length);
                                combinedData.set(privateData.metadataSalt.value!, privateData.randomlyGeneratedFileKey.value!.length + privateData.fileSalt.value!.length);
                                const isTagValid = await CheckRecordIntegrity(decodedTag, masterKey, cutIterations, combinedData);
                                privateData.encryptedTag.integrity = isTagValid;
                            }
                        } catch (error) {
                            console.error(`Error verifying tag integrity for backup ${doc.id}:`, error);
                            privateData.encryptedTag.integrity = false;
                            privateData.encryptedTag.status = "corrupted";
                        }
                    } else {
                        privateData.encryptedTag.status = "corrupted";
                        privateData.encryptedTag.integrity = false;
                    }
                }
                fetchedBackups.push({
                    id: doc.id,
                    privateData,
                    encryptedData: undefined,
                    decryptedResult: undefined,
                    createdAt: data.createdAt?.toDate() || null,
                    downloads: data.downloads ?? null,
                    size: data.size ?? -1,
                    isPublic: data.isPublic ?? false,
                });
            }
            project.backups = fetchedBackups; // Update backups for this project
        }
        return updatedProjects; // Return modified projects
    } catch (error) {
        console.error("Error fetching or decrypting backups:", error);
        showErrorModal(`
            <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
            <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
        `);
        throw error;
    }
  };

  const fetchMetadataForAllBackups = async (projects: Project[]): Promise<Project[]> => {
    try {
      validateCryptographicValues(masterKey, iterations);
      await new Promise((resolve) => setTimeout(resolve, 24)); // Simulate delay

      const user = auth.currentUser;
      if (!user) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        await show_authentication_error();
        throw new Error("User not authenticated");
      }

      const updatedProjects = [...projects]; // Copy of the current projects state

      Swal.update({
        title: t("processing-backups"),
        html: `
          <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
            ${t("fetching-and-decrypting-metadata")}
          </p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please-be-patient-this-can-take-a-while")}</p>
        `,
        allowOutsideClick: false,
        showCloseButton: false,
        showCancelButton: false,
        customClass: { popup: "swal-custom-popup" },
      });

      Swal.showLoading();

      let totalBackups = 0;
      let currentBackupIndex = 0;

      // Count total backups
      for (const project of projects) {
        totalBackups += project.backups.length;
      }

      // Iterate over each project and its backups
      for (const project of projects) {
        const backupsRef = collection(db, `data/${user.email}/backups`);
        const querySnapshot = await getDocs(backupsRef);

        for (const doc of querySnapshot.docs) {
          await new Promise(resolve => setTimeout(resolve, 24));

          const data = doc.data();
          const backupID = doc.id;
          const targetBackup = project.backups.find((b) => b.id === backupID);

          if (!targetBackup) {
            console.warn(`Backup with ID ${backupID} not found in local state`);
            continue;
          }

          currentBackupIndex++; // Increment only if the backup is found

          Swal.update({
            title: t("processing-backups"),
            html: `
              <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                ${t("step_n_of_m", { currentStep: 2, totalSteps: 2 })}
              </p>
              <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                ${t("fetching_and_decrypting_metadata_of_backup_n_of_m", { currentBackupIndex, totalBackups })}
              </p>
              <p style="margin-bottom:5px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            showCloseButton: false,
            showCancelButton: false,
            customClass: { popup: "swal-custom-popup" },
          });

          const privateData = targetBackup.privateData;
          const encryptedData: {
            encryptedFilename: { value: Uint8Array | null; status: "valid" | "corrupted" | "absent" };
            encryptedDescription: { value: Uint8Array | null; status: "valid" | "corrupted" | "absent" };
            encryptedMetadataTag: { value: Uint8Array | null; status: "valid" | "corrupted" | "absent" };
            encryptedRecordIntegrityTag: { value: Uint8Array | null; status: "valid" | "corrupted" | "absent" };
          } = {
            encryptedFilename: { value: null, status: "absent" },
            encryptedDescription: { value: null, status: "absent" },
            encryptedMetadataTag: { value: null, status: "absent" },
            encryptedRecordIntegrityTag: { value: null, status: "absent" },
          };

          // ===== HANDLE ENCRYPTED FILENAME =====
          if (data.encryptedFilename) {
            const decodedFilename = base64ToUint8Array(data.encryptedFilename);
            if (decodedFilename.length % 16 === 0) {
              encryptedData.encryptedFilename.value = decodedFilename;
              encryptedData.encryptedFilename.status = "valid";
            } else {
              encryptedData.encryptedFilename.status = "corrupted";
              encryptedData.encryptedFilename.value = null;
            }
          } else {
            encryptedData.encryptedFilename.status = "absent";
          }

          // ===== HANDLE ENCRYPTED DESCRIPTION =====
          if (data.encryptedDescription) {
            const decodedDescription = base64ToUint8Array(data.encryptedDescription);
            if (decodedDescription.length % 16 === 0) {
              encryptedData.encryptedDescription.value = decodedDescription;
              encryptedData.encryptedDescription.status = "valid";
            } else {
              encryptedData.encryptedDescription.status = "corrupted";
              encryptedData.encryptedDescription.value = null;
            }
          } else {
            encryptedData.encryptedDescription.status = "absent";
          }

          // ===== HANDLE ENCRYPTED METADATA TAG =====
          if (data.encryptedMetadataTag) {
            const decodedMetadataTag = base64ToUint8Array(data.encryptedMetadataTag);
            if (decodedMetadataTag.length % 16 === 0) {
              encryptedData.encryptedMetadataTag.value = decodedMetadataTag;
              encryptedData.encryptedMetadataTag.status = "valid";
            } else {
              encryptedData.encryptedMetadataTag.status = "corrupted";
              encryptedData.encryptedMetadataTag.value = null;
            }
          } else {
            encryptedData.encryptedMetadataTag.status = "absent";
          }

          // ===== CHECK IF DECRYPTION IS POSSIBLE =====
          const canDecrypt = privateData.randomlyGeneratedFileKey?.status === "valid" && privateData.metadataSalt?.status === "valid";
          let decryptedResult: Backup["decryptedResult"];

          if (canDecrypt) {
            const result = await decryptBackupMetadata(
              privateData.randomlyGeneratedFileKey.value!,
              privateData.metadataSalt.value!,
              iterations,
              encryptedData.encryptedFilename?.status === "valid" ? encryptedData.encryptedFilename.value : null,
              encryptedData.encryptedDescription?.status === "valid" ? encryptedData.encryptedDescription.value : null,
              encryptedData.encryptedMetadataTag?.status === "valid" ? encryptedData.encryptedMetadataTag.value : null
            );
            decryptedResult = {
              decryptedFilename: result.decryptedFilename ? new TextDecoder().decode(result.decryptedFilename) : null,
              filenameIntegrity: result.filenameIntegrity,
              decryptedDescription: result.decryptedDescription ? new TextDecoder().decode(result.decryptedDescription) : null,
              descriptionIntegrity: result.descriptionIntegrity,
              metadataIntegrity: result.metadataIntegrity,
            };
          } else {
            decryptedResult = {
              decryptedFilename: null,
              filenameIntegrity: null,
              decryptedDescription: null,
              descriptionIntegrity: null,
              metadataIntegrity: null,
            };
          }

          // Update the backup object with processed data
          targetBackup.encryptedData = encryptedData;
          targetBackup.decryptedResult = decryptedResult;
          targetBackup.createdAt = data.createdAt?.toDate() || targetBackup.createdAt || null;
          targetBackup.downloads = data.downloads ?? targetBackup.downloads ?? null;
          targetBackup.size = data.size ?? targetBackup.size ?? -1;
          targetBackup.encryptedSize = data.encryptedSize ?? targetBackup.encryptedSize ?? -1;
          targetBackup.isPublic = data.isPublic ?? targetBackup.isPublic ?? false;

          // ===== HANDLE ENCRYPTED RECORD INTEGRITY TAG =====
          if (data.encryptedRecordIntegrityTag) {
            const decodedRecordTag = base64ToUint8Array(data.encryptedRecordIntegrityTag);
            if (decodedRecordTag.length % 16 === 0) {
              encryptedData.encryptedRecordIntegrityTag.value = decodedRecordTag;
              encryptedData.encryptedRecordIntegrityTag.status = "valid";
            } else {
              encryptedData.encryptedRecordIntegrityTag.status = "corrupted";
              encryptedData.encryptedRecordIntegrityTag.value = null;
            }
          } else {
            encryptedData.encryptedRecordIntegrityTag.status = "absent";
          }

          // Update the backup object (add this after other encryptedData assignments)
          targetBackup.encryptedRecordIntegrityTag = {
            value: encryptedData.encryptedRecordIntegrityTag.value,
            integrity: encryptedData.encryptedRecordIntegrityTag.status === "valid" ? true : null,
            status: encryptedData.encryptedRecordIntegrityTag.status,
          };
        }
      }

      return updatedProjects; // Return modified projects
    } catch (error) {
      console.error("Error fetching or decrypting backups:", error);
      showErrorModal(`
        <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `);
      throw error;
    }
  };
  
  const decryptBackupMetadata = async (
    randomlyGeneratedFileKey: Uint8Array,
    metadataSalt: Uint8Array,
    numberOfIterationsForArgon2: number,
    encryptedFilename: Uint8Array | null, // Allow null
    encryptedDescription: Uint8Array | null, // Allow null
    encryptedMetadataTag: Uint8Array | null // Allow null
  ): Promise<{
    filenameIntegrity: boolean | null;
    descriptionIntegrity: boolean | null;
    metadataIntegrity: boolean | null;
    decryptedFilename: Uint8Array | null;
    decryptedDescription: Uint8Array | null;
  }> => {
    const remainingMasterKeyPart = masterKey.slice(192); // 80 bytes
    const randomPartForRemainingKeys = randomlyGeneratedFileKey.slice(272); // Use the remaining random bytes

    const mergedRemainingKey = new Uint8Array(randomPartForRemainingKeys.length + remainingMasterKeyPart.length);
    mergedRemainingKey.set(randomPartForRemainingKeys);
    mergedRemainingKey.set(remainingMasterKeyPart, randomPartForRemainingKeys.length);

    const metadataKey = await deriveBytesUsingArgon2id(
      mergedRemainingKey,
      metadataSalt,
      numberOfIterationsForArgon2,
      672
    );

    // Split the derived remaining keys into three equal parts
    const FileNameKey = metadataKey.slice(0, 224);
    const DescriptionKey = metadataKey.slice(224, 448);
    const MetadataIntegrityKey = metadataKey.slice(448);
    
    let filenameIntegrity: boolean | null = null;
    let descriptionIntegrity: boolean | null = null;
    let metadataIntegrity: boolean | null = null;
    let decryptedFilename: Uint8Array | null = null;
    let decryptedDescription: Uint8Array | null = null;
    
    if (!encryptedFilename && !encryptedDescription) {
      // Both filename and description are missing, this is an error
      filenameIntegrity = false;
      descriptionIntegrity = false;
      metadataIntegrity = false;
    } else if (!encryptedFilename && encryptedDescription) {
      // Filename is missing, description is present, this is an error
      filenameIntegrity = false;
      const [decryptedDescriptionArray, descriptionIntegrityTemp] = await decryptStringWithTwoCiphersCBC(encryptedDescription, DescriptionKey);
      descriptionIntegrity = descriptionIntegrityTemp;
      decryptedDescription = decryptedDescriptionArray;
      metadataIntegrity = false; // Metadata integrity is compromised because filename is missing
    } else if (encryptedFilename && !encryptedDescription && !encryptedMetadataTag) {
      // Filename is present, description and metadata tag are absent
      const [decryptedFileNameArray, filenameIntegrityTemp] = await decryptStringWithTwoCiphersCBC(encryptedFilename, FileNameKey);
      filenameIntegrity = filenameIntegrityTemp;
      decryptedFilename = decryptedFileNameArray;
      descriptionIntegrity = null; // Description is not required, so it's not an error if it's missing
      metadataIntegrity = null; // No metadata tag is expected if no description
    } else if (encryptedFilename && !encryptedDescription && encryptedMetadataTag) {
      // Filename is present, description is missing, metadata tag is present
      const [decryptedFileNameArray, filenameIntegrityTemp] = await decryptStringWithTwoCiphersCBC(encryptedFilename, FileNameKey);
      filenameIntegrity = filenameIntegrityTemp;
      decryptedFilename = decryptedFileNameArray;
      descriptionIntegrity = null; // Description is not required, but metadata tag is present without description, which is an error
      metadataIntegrity = false; // Metadata tag is present but description is missing, which is an error
    } else if (encryptedFilename && encryptedDescription && !encryptedMetadataTag) {
      // Filename and description are present, metadata tag is missing
      const [decryptedFileNameArray, filenameIntegrityTemp] = await decryptStringWithTwoCiphersCBC(encryptedFilename, FileNameKey);
      filenameIntegrity = filenameIntegrityTemp;
      decryptedFilename = decryptedFileNameArray;
      const [decryptedDescriptionArray, descriptionIntegrityTemp] = await decryptStringWithTwoCiphersCBC(encryptedDescription, DescriptionKey);
      descriptionIntegrity = descriptionIntegrityTemp;
      decryptedDescription = decryptedDescriptionArray;
      metadataIntegrity = false; // Metadata tag is missing, which is an error if description is present
    } else if (encryptedFilename && encryptedDescription && encryptedMetadataTag) {
      // All are present
      const [decryptedFileNameArray, filenameIntegrityTemp] = await decryptStringWithTwoCiphersCBC(encryptedFilename, FileNameKey);
      filenameIntegrity = filenameIntegrityTemp;
      decryptedFilename = decryptedFileNameArray;
      const [decryptedDescriptionArray, descriptionIntegrityTemp] = await decryptStringWithTwoCiphersCBC(encryptedDescription, DescriptionKey);
      descriptionIntegrity = descriptionIntegrityTemp;
      decryptedDescription = decryptedDescriptionArray;
      const combinedDecryptedData = new Uint8Array(decryptedFilename.length + decryptedDescriptionArray.length);
      combinedDecryptedData.set(decryptedFilename, 0);
      combinedDecryptedData.set(decryptedDescriptionArray, decryptedFilename.length);
      metadataIntegrity = await CheckBackupIntegrity(encryptedMetadataTag, MetadataIntegrityKey, combinedDecryptedData);
    }

    //if (decryptedFilename)
      //console.log(new TextDecoder().decode(decryptedFilename));
    //if (decryptedDescription)
      //console.log(new TextDecoder().decode(decryptedDescription));
    //console.log(metadataIntegrity);

    return {
      filenameIntegrity,
      descriptionIntegrity,
      metadataIntegrity,
      decryptedFilename,
      decryptedDescription,
    };
  };

  const handleRefresh = async () => {
    setRefreshModalShown(true);
  };

  const refreshAllBackups = async () => {
    setRefreshModalShown(false);
    await handleRefreshUsersOwnProjects();
    await refreshReceivedBackups();
    await refreshSentBackups();
  };
  

  const handleRefreshUsersOwnProjects = async () => {
    setRefreshModalShown(false);
    try {
      // Validate cryptographic values
      validateCryptographicValues(masterKey, iterations);
      await new Promise(resolve => setTimeout(resolve, 24));

      // Ensure user is authenticated
      const user = auth.currentUser;
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 50));
        await show_authentication_error();
        throw new Error("User not authenticated");
      }

      setProjects([]);

      // Show loading modal
      Swal.fire({
        title: t("fetching-projects"),
        html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>`,
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        customClass: { popup: "swal-custom-popup" },
        didOpen: () => { Swal.showLoading(); },
      });

      // Fetch projects from Firebase
      const projectsRef = collection(db, `data/${user.email}/private/encrypted/projectInfo`);
      const querySnapshot = await getDocs(projectsRef);
      let fetchedProjects: Project[] = [];
      const cutIterations = parseInt((iterations / 10).toString(), 10);
      const derivedKey = masterKey.slice(114);

      for (const [, doc] of querySnapshot.docs.entries()) {

        const data = doc.data();
        let decryptedName = t("corrupt-project-name");
        let decryptedDescription: string | undefined = undefined;
        let integrity = true;

        // ===== NAME INTEGRITY CHECK =====
        try {
          if (!data.name || data.name.trim() === "") {
            decryptedName = t("missing-project-name");
            integrity = false;
          } else {
            const decodedName = base64ToUint8Array(data.name);
            if (decodedName.length % 16 !== 0) {
              decryptedName = t("corrupt-project-name");
              integrity = false;
            } else {
              const [decryptedNameArray, nameIntegrity] = 
                await decryptFieldValueWithTwoCiphersCBC(decodedName, derivedKey, cutIterations);
              decryptedName = new TextDecoder().decode(decryptedNameArray);
              integrity = nameIntegrity;
            }
          }
        } catch (error) {
          console.error(`Error decrypting project name for project ${doc.id}:`, error);
          decryptedName = t("corrupt-project-name");
          integrity = false;
        }

        // ===== DESCRIPTION HANDLING =====
        try {
          if (data.description && data.description.trim() !== "" && data.description !== "none") {
            const decodedDescription = base64ToUint8Array(data.description);
            if (decodedDescription.length % 16 !== 0) {
              decryptedDescription = t("corrupt-description");
              integrity = false;
            } else {
              const [decryptedDescriptionArray, descriptionIntegrity] = 
                await decryptFieldValueWithTwoCiphersCBC(decodedDescription, derivedKey, cutIterations);
              decryptedDescription = new TextDecoder().decode(decryptedDescriptionArray);
              integrity = integrity && descriptionIntegrity;
            }
          } else if (!data.description) {
            // Absent (not "none") - mark as invalid
            decryptedDescription = t("missing-description");
            integrity = false;
          }
          // Else: "none" is valid, leave description undefined
        } catch (error) {
          console.error(`Error decrypting project description for project ${doc.id}:`, error);
          decryptedDescription = t("corrupt-description");
          integrity = false;
        }

        // ===== TAG INTEGRITY CHECK =====
        try {
          if (data.tag && data.tag.trim() !== "" && data.tag !== "none") {
            const decodedTag = base64ToUint8Array(data.tag);
            if (decodedTag.length % 16 === 0) {
              // Only verify tag if we have both name and description
              if (data.description !== "none" && decryptedDescription) {
                const combinedData = new Uint8Array(
                  new TextEncoder().encode(decryptedName).length + 
                  new TextEncoder().encode(decryptedDescription).length
                );
                combinedData.set(new TextEncoder().encode(decryptedName), 0);
                combinedData.set(new TextEncoder().encode(decryptedDescription), new TextEncoder().encode(decryptedName).length);
                
                const isTagValid = await CheckRecordIntegrity(decodedTag, derivedKey, cutIterations, combinedData);
                integrity = integrity && isTagValid;
              }
            } else {
              integrity = false;
            }
          } else if (!data.tag && data.description !== "none") {
            // Tag is absent but description exists (not "none") - invalid
            integrity = false;
          }
          // Else: "none" is valid when description is also "none"
        } catch (error) {
          console.error(`Error verifying project tag for project ${doc.id}:`, error);
          integrity = false;
        }

        // ===== FINAL INTEGRITY RULES =====
        // Case 1: Both description and tag are "none" - only check name integrity
        if (data.description === "none" && data.tag === "none") {
          // integrity already reflects name integrity at this point
          decryptedDescription = undefined;
        }
        // Case 2: Any field is missing (not "none") - integrity is false
        else if (!data.name || !data.description || !data.tag) {
          integrity = false;
        }

        // ===== CREATE PROJECT OBJECT =====
        const createdAtTimestamp = data.createdAt?.toDate() || new Date();
        const newProject: Project = {
          id: doc.id,
          name: decryptedName,
          description: decryptedDescription,
          integrity,
          createdAt: createdAtTimestamp,
          backups: [],
        };

        fetchedProjects.push(newProject);
      }

      setTimeout(() => setProjects(fetchedProjects), 100); 

      fetchedProjects = await fetchPrivatePartOfBackupsForProjects(fetchedProjects);

      // Fetch metadata for all backups
      fetchedProjects = await fetchMetadataForAllBackups(fetchedProjects);

      // Set final processed projects to state with a delay
      setTimeout(() => setProjects(fetchedProjects), 100);
      Swal.close();
    } catch (error) {
      console.error("Error fetching or decrypting projects:", error);
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
      showErrorModal(errorMessage);
    }
  };

  const validateCryptographicValues = (masterKey: Uint8Array, iterations: number) => {
    if (masterKey.length !== 272 || iterations <= 0) {
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('cryptographic-error-line1')}</p>
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('authentication-error-line2')}</p>
      `;
      showNonClosableModal(errorMessage);
      throw new Error("At least one cryptographic value is invalid");
    }
  };

  // New Project Stuff (Below)

  const generateUniqueId = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = window.crypto.getRandomValues(new Uint8Array(10));
    return Array.from(randomValues, (byte) => charset[byte % charset.length]).join('');
  };

  const handleNewProjectClose = async (name: string | null, description: string | null) => {
    setIsNewProjectModalOpen(false);
    if (name) {
      validateCryptographicValues(masterKey, iterations);
      Swal.fire({
          title: t('creating-project'), // Use translation key for this message
          html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`, // Use translation key for this message
          color: "var(--foreground)",
          background: "var(--card-background)",
          width: 640,
          allowOutsideClick: false,
          customClass: {
            popup: "swal-custom-popup", // Custom class for styling
          },
          didOpen: () => {
              Swal.showLoading();
          }
      });
      await new Promise(resolve => setTimeout(resolve, 24));
      const cut_iterations = parseInt((iterations / 10).toString(), 10);
      const projectNameBytes = new TextEncoder().encode(name);
      const encryptedProjectName = await silentlyEncryptDataWithTwoCiphersCBC(projectNameBytes, masterKey.slice(114), cut_iterations);
      if (description && description.trim() !== "") {
        const descriptionBytes = new TextEncoder().encode(description);
        const encryptedProjectDescription = await silentlyEncryptDataWithTwoCiphersCBC(descriptionBytes, masterKey.slice(114), cut_iterations);
        const combinedData = new Uint8Array(projectNameBytes.length + descriptionBytes.length);
        combinedData.set(projectNameBytes, 0);
        combinedData.set(descriptionBytes, projectNameBytes.length);
        const encryptedTag = await encryptPrivateRecordTagWithTwoCiphersCBC(combinedData, masterKey.slice(114), cut_iterations);
        createProject(name, description, btoa(String.fromCharCode(...encryptedProjectName)), btoa(String.fromCharCode(...encryptedProjectDescription)), btoa(String.fromCharCode(...encryptedTag)));
      } else {
        createProject(name, null, btoa(String.fromCharCode(...encryptedProjectName)));
      }
    }
  };

  const createProject = async (
    plaintextName: string,
    plaintextDescription: string | null,
    projectName: string,
    description?: string,
    tag?: string,
  ): Promise<void> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 50));
        await show_authentication_error();
        throw new Error("User not authenticated");
      }
      const userEmail = user.email;
  
      // Check if the user has less than 2 projects
      const projectsRef = collection(db, `data/${userEmail}/private/encrypted/projectInfo`);
      const projectsSnapshot = await getDocs(projectsRef);
      if (projectsSnapshot.size >= 2) {
        const errorMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('project-limit-reached')}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('delete_existing_project_to_create_new')}</p>`;
        showErrorModal(errorMessage);
      } else {
        let uniqueProjectId: string = "";
        let isUniqueProject = false;
    
        while (!isUniqueProject) {
          uniqueProjectId = generateUniqueId();
          const docRef = doc(db, `data/${userEmail}/private/encrypted/projectInfo`, uniqueProjectId);
          const docSnap = await getDoc(docRef);
          isUniqueProject = !docSnap.exists();
        }
    
        // Create project data
        const projectData = {
          name: projectName,
          description: description || "none",
          tag: tag || "none",
          createdAt: serverTimestamp(),
        };

        const projectDataForList: Project = {
          id: uniqueProjectId,
          name: plaintextName,
          integrity: true,
          backups: [],
        };

        if (plaintextDescription) {
          projectDataForList.description = plaintextDescription;
        }

        // Save project to Firestore
        const projectRef = doc(db, `data/${userEmail}/private/encrypted/projectInfo`, uniqueProjectId);
        await setDoc(projectRef, projectData);
        setProjects([...projects, projectDataForList]);
        //console.log(`Project created successfully with ID: ${uniqueProjectId}`);
        Swal.close();
        toast.success(t('project-created-successfully'));
      }
    } catch (error) {
      const errorMessage = `
      <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
      <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
      showErrorModal(errorMessage);
      console.error("Error creating project:", error);
    }
  };

  // New Project Stuff (Above)  

  // File Encrypter (Below)
  const handleFileEncrypterClose = async (result: {
    randomlyGeneratedFileKey: Uint8Array | null;
    fileSalt: Uint8Array | null;
    metadataSalt: Uint8Array | null;
    encryptedFileContent: Uint8Array | null;
    encryptedFilename: Uint8Array | null;
    encryptedDescription: Uint8Array | null;
    encryptedMetadataTag: Uint8Array | null;
    encryptedRecordIntegrityTag: Uint8Array | null;
    isThereAnError: boolean;
    errorMessage: string;
    plaintextFilename: string | null;
    plaintextDescription: string | null;
    fileSize: number | null; // File size in bytes
  }): Promise<void> => {
    setIsEncrypterOpen(false);
  
    // Handle errors
    if (result.isThereAnError) {
      console.error("File encrypter error:", result.errorMessage);
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? "rtl" : "ltr"}">
          ${t("something_went_wrong_line1")}
        </p>
        <p dir="${isRTL ? "rtl" : "ltr"}">${t("check_the_console")}</p>`;
      showErrorModal(errorMessage);
      return;
    }
  
    // Validate required fields
    if (
      !result.randomlyGeneratedFileKey ||
      !result.fileSalt ||
      !result.metadataSalt ||
      !result.encryptedFileContent ||
      !result.encryptedFilename
    ) {
      return;
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
        await show_authentication_error();
        throw new Error("User not authenticated");
      }
  
      validateCryptographicValues(masterKey, iterations);
  
      const userEmail = user.email!;
      let uniqueBackupId = "";
      let isUnique = false;
  
      // Ensure unique ID for the backup
      while (!isUnique) {
        uniqueBackupId = generateUniqueId();
        const docRef = doc(
          db,
          `data/${userEmail}/backups/${uniqueBackupId}`
        );
        const docSnap = await getDoc(docRef);
        isUnique = !docSnap.exists();
      }
  
      if (!activeProjectId) {
        throw new Error("No active project selected.");
      }
  
      // Define paths for private and non-private backups
      const privateBackupPath = `data/${userEmail}/private/encrypted/projectInfo/${activeProjectId}/backups/${uniqueBackupId}`;
      const nonPrivateBackupPath = `data/${userEmail}/backups/${uniqueBackupId}`;
      
      // Remove this snippet to disable the backup limit
      const backupsCollectionRef = collection(db, `data/${userEmail}/private/encrypted/projectInfo/${activeProjectId}/backups`);
      const backupsSnapshot = await getDocs(backupsCollectionRef);
      if (backupsSnapshot.size >= 5) {
        const errorMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('backup_limit_reached_message')}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('delete_backup_to_add_new')}</p>`;
        showErrorModal(errorMessage);
        return;
      }
      // Remove this snippet to disable the backup limit

      // Step 1: Encrypt cryptographic information
      const filename = result.plaintextFilename || "unknown-name"; // Default to "unknown-name" if null
      const cutIterations = parseInt((iterations / 3).toString(), 10);
  
      const encryptedRandomKey = await silentlyEncryptDataWithTwoCiphersCBCnoPadding(
        result.randomlyGeneratedFileKey!,
        masterKey,
        cutIterations
      );
      const encryptedFileSalt = await silentlyEncryptDataWithTwoCiphersCBCnoPadding(
        result.fileSalt!,
        masterKey,
        cutIterations
      );
      const encryptedMetadataSalt = await silentlyEncryptDataWithTwoCiphersCBCnoPadding(
        result.metadataSalt!,
        masterKey,
        cutIterations
      );
  
      // Combine all cryptographic data for tag computation
      const combinedData = new Uint8Array(
        result.randomlyGeneratedFileKey!.length +
          result.fileSalt!.length +
          result.metadataSalt!.length
      );
      combinedData.set(result.randomlyGeneratedFileKey!, 0);
      combinedData.set(result.fileSalt!, result.randomlyGeneratedFileKey!.length);
      combinedData.set(
        result.metadataSalt!,
        result.randomlyGeneratedFileKey!.length + result.fileSalt!.length
      );
  
      const encryptedTag = await encryptPrivateRecordTagWithTwoCiphersCBC(
        combinedData,
        masterKey,
        cutIterations
      );
  
      Swal.update({
        title: filename,
        html: `
          <p style="margin-bottom: 10px;" dir="${isRTL ? "rtl" : "ltr"}">
            ${t("uploading_cryptographic_info")}
          </p>
          <p dir="${isRTL ? "rtl" : "ltr"}">${t("please_wait")}</p>`,
        showConfirmButton: false,
        allowOutsideClick: false,
        customClass: { popup: "swal-custom-popup" },
      });
      
      Swal.showLoading();
  
      const cryptographicInfo = {
        randomlyGeneratedFileKey: btoa(String.fromCharCode(...encryptedRandomKey)),
        fileSalt: btoa(String.fromCharCode(...encryptedFileSalt)),
        metadataSalt: btoa(String.fromCharCode(...encryptedMetadataSalt)),
        encryptedTag: btoa(String.fromCharCode(...encryptedTag)),
      };
  
      await setDoc(doc(db, `${privateBackupPath}`), cryptographicInfo);
  
      // Step 2: Upload metadata
      Swal.update({
        html: `
          <p style="margin-bottom: 10px;" dir="${isRTL ? "rtl" : "ltr"}">
            ${t("uploading_backup_metadata")}
          </p>
          <p style="margin-bottom:10px;" dir="${isRTL ? "rtl" : "ltr"}">${t("please_wait")}</p>`,
      });
      const metadata = {
        encryptedFilename: btoa(String.fromCharCode(...result.encryptedFilename)),
        encryptedDescription:
          result.encryptedDescription !== null
            ? btoa(String.fromCharCode(...result.encryptedDescription))
            : "none",
        encryptedMetadataTag:
          result.encryptedMetadataTag !== null
            ? btoa(String.fromCharCode(...result.encryptedMetadataTag))
            : "none",
        encryptedRecordIntegrityTag:
          result.encryptedRecordIntegrityTag !== null
            ? btoa(String.fromCharCode(...result.encryptedRecordIntegrityTag))
            : "none",
            
        createdAt: serverTimestamp(),
        downloads: 0, // Initialize download count to zero
        size: result.fileSize ?? -1, // Use fileSize or default to -1 if unavailable
        encryptedSize: result.encryptedFileContent?.length ?? -1,
        isPublic: false, // Default to private backups
      }; 
  
      await setDoc(doc(db, `${nonPrivateBackupPath}`), metadata);
      
      const newBackup: Backup = {
        id: uniqueBackupId,
        privateData: {
          randomlyGeneratedFileKey: {
            value: result.randomlyGeneratedFileKey,
            integrity: true,
            status: "valid",
          },
          fileSalt: {
            value: result.fileSalt,
            integrity: true,
            status: "valid",
          },
          metadataSalt: {
            value: result.metadataSalt,
            integrity: true,
            status: "valid",
          },
          encryptedTag: {
            value: result.encryptedMetadataTag,
            integrity: true,
            status: "valid",
          },
        },
        encryptedRecordIntegrityTag: {
          value: result.encryptedRecordIntegrityTag,
          integrity: null,
          status: "valid",
        },
        encryptedData: {
          encryptedFilename: {
            value: result.encryptedFilename,
            status: result.encryptedFilename ? "valid" : "absent",
          },
          encryptedDescription: {
            value: result.encryptedDescription,
            status: result.encryptedDescription ? "valid" : "absent",
          },
          encryptedMetadataTag: {
            value: result.encryptedMetadataTag,
            status: "valid",
          },
        },
        decryptedResult: {
          decryptedFilename:
            result.encryptedFilename !== null
              ? result.plaintextFilename
              : null,
          decryptedDescription:
            result.encryptedDescription !== null
              ? result.plaintextDescription
              : null,
          filenameIntegrity:
            result.encryptedFilename !== null ? true : null,
          descriptionIntegrity:
            result.encryptedDescription !== null ? true : null,
          metadataIntegrity:
            result.encryptedMetadataTag !== null ? true : null,
        },
        createdAt: new Date(),
        downloads: 0,
        size: result.fileSize ?? -1,
        encryptedSize: result.encryptedFileContent?.length ?? -1,
        isPublic: false,
      };      
  
      // Step 3: Upload chunked file content
      Swal.update({
        html: `
          <p style="margin-bottom: 10px;" dir="${isRTL ? "rtl" : "ltr"}">
            ${t("uploading_backup_to_cloud")}
          </p>
            <p style="margin-bottom:10px;" dir="${isRTL ? "rtl" : "ltr"}">
              ${t("progress")}: 0.00%
            </p>
          <p style="margin-bottom:10px;" dir="${isRTL ? "rtl" : "ltr"}">${t("please_wait")}</p>`,
      });
  
      const chunkSize = 16 * 1024; // Chunk size (16 KB)
      const totalChunks = Math.ceil(result.encryptedFileContent.length / chunkSize);
  
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, result.encryptedFileContent.length);
        const chunk = result.encryptedFileContent.slice(start, end);
        const chunkB64 = btoa(String.fromCharCode(...chunk));
  
        await setDoc(
          doc(db, `${nonPrivateBackupPath}/chunks`, `${i}`),
          { data: chunkB64 }
        );
  
        // Update progress percentage in SweetAlert modal
        const progress = ((i + 1) / totalChunks) * 100;
  
        Swal.update({
          html: `
            <p style="margin-bottom: 10px;" dir="${isRTL ? "rtl" : "ltr"}">
              ${t("uploading_backup_to_cloud")}
            </p>
            <p style="margin-bottom:10px;" dir="${isRTL ? "rtl" : "ltr"}">
              ${t("progress")}: ${progress.toFixed(2)}%
            </p>
            <p style="margin-bottom:10px;" dir="${isRTL ? "rtl" : "ltr"}">${t("please_wait")}</p>`,
          showConfirmButton: false,
        });
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }
  
      Swal.close();     
      updateProjectsWithBackup(activeProjectId, newBackup);
      toast.success(t("backup_uploaded_successfully")); // Show success toast
  
    } catch (error) {
      
     console.error("Error uploading backup:", error);
  
     Swal.close(); 
  
     showErrorModal(`
         <p style="margin-bottom:10px;" dir="${isRTL ? "rtl" : "ltr"}">
           ${t("something_went_wrong_line1")}
         </p>
         <p dir="${isRTL ? "rtl" : "ltr"}">${t("check_the_console")}</p>
       `);
  }
  };

  const updateProjectsWithBackup = (
    projectId: string,
    backupData: Backup
  ): void => {
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              backups: [...project.backups, backupData],
            }
          : project
      )
    );
  };  
  // File Encrypter (Above)

  // File Catcher (Below)

  const handleCreateNewBackup = async (projectId: string) => {
    setActiveProjectId(projectId);
    const user = auth.currentUser;
    if (!user) {
      await new Promise(resolve => setTimeout(resolve, 50));
      await show_authentication_error();
      throw new Error('User not authenticated');
    }
    setIsFileCatcherOpen(true);
  };

  const show_authentication_error = async () =>{
    const errorMessage = `
      <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('authentication-error-line1')}</p>
      <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('authentication-error-line2')}</p>
    `;
    showNonClosableModal(errorMessage);
  }

  const handleFileProcessingResult = (file: File | null, projectId: string | null) => {
    setIsFileCatcherOpen(false);
    setActiveProjectId(projectId);
    if (projectId) {
      processBackupFile(file, projectId);
    }
  };

  const processBackupFile = (file: File | null, projectId: string) => {
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
  
    // Validation checks
    if (!file) {
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('empty_file_error')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please-try-again-or-select-a-different-file')}</p>
      `;
      showErrorModal(errorMessage);
      return;
    }
  
    if (file.size > MAX_FILE_SIZE) {
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('file_size_error')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('max_size_3mb')}</p>
      `;
      showErrorModal(errorMessage);
      return;
    }
    setIsEncrypterOpen(true);
    setSelectedFileForFileEncrypter(file);
  };
  
  // File Catcher (Above)
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

  const showNonClosableModal = (errorMessage: string) => {
    Swal.fire({
      icon: "error",
      title: t('error_inscription'),
      html: errorMessage,
      width: 600,
      padding: "3em",
      color: "var(--foreground)",
      background: "var(--card-background)",
      showConfirmButton: false,
      allowOutsideClick: false,
      customClass: {
        popup: "swal-custom-popup",
      },
    });
  };

  const handleViewBackupDetails = (projectId: string, backupId: string) => {
    //console.log("projectID:", projectId, "backupID:", backupId);
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      const backup = project.backups.find((b) => b.id === backupId);
      if (backup) {
        setCurrentBackupDetails(backup); // Renamed from setSelectedBackup
        setIsBackupDetailsModalOpen(true); // Renamed from setIsModalOpen
      }
    }
  };
  
  const handleCloseBackupDetailsModal = () => {
    setIsBackupDetailsModalOpen(false); // Renamed from setIsModalOpen
    setCurrentBackupDetails(null); // Renamed from setSelectedBackup
  };
  
  interface FileDecrypterProps {
    encryptedFileContent: Uint8Array;
    fileSalt: Uint8Array;
    masterKey: Uint8Array;
    randomlyGeneratedFileKey: Uint8Array;
    numberOfIterationsForArgon2: number;
    encryptedRecordIntegrityTag?: Uint8Array;
    encodedDecryptedFilename?: Uint8Array;
    encodedDecryptedDescription?: Uint8Array;
    onClose: (result: {
      decryptedFileContent: Uint8Array;
      fileIntegrityCompromised: boolean;
      recordIntegrity: boolean;
      isThereAnError: boolean;
      errorMessage: string;
    }) => void;
  }

  const handleDownloadBackup = async (backupId: string) => {
    const user = auth.currentUser;
    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      await show_authentication_error();
      throw new Error("User not authenticated");
    }
    if (!user.email) return;

    try {
      const targetBackup = projects.flatMap(project => project.backups).find(backup => backup.id === backupId);
      if (!targetBackup) {
        console.error('Backup not found');
        return;
      }

      const encryptionData = {
        fileKey: targetBackup.privateData.randomlyGeneratedFileKey.value,
        fileSalt: targetBackup.privateData.fileSalt.value,
        metadataSalt: targetBackup.privateData.metadataSalt.value,
        encryptedTag: targetBackup.privateData.encryptedTag.value,
        encodedFilename: targetBackup.decryptedResult?.decryptedFilename || null,
        encodedDescription: targetBackup.decryptedResult?.decryptedDescription || null,
        encryptedMetadataTag: targetBackup.encryptedData?.encryptedMetadataTag?.value || null,
        recordIntegrityTag: targetBackup.encryptedRecordIntegrityTag?.value,
      };

      if (!encryptionData.fileKey || !encryptionData.fileSalt) {
        throw new Error("Missing necessary cryptographic info. Verify backup integrity.");
      }

      const encryptedLength = typeof targetBackup.encryptedSize === 'number' && targetBackup.encryptedSize > 0 ? targetBackup.encryptedSize : null;
      const encryptedFileContent = await downloadBackupChunks(user.email, backupId, encryptedLength);
      const encoder = new TextEncoder();
      const fileDecrypterProps: FileDecrypterProps = {
        encryptedFileContent,
        fileSalt: encryptionData.fileSalt,
        masterKey: masterKey,
        randomlyGeneratedFileKey: encryptionData.fileKey,
        numberOfIterationsForArgon2: iterations,
        encryptedRecordIntegrityTag: encryptionData.recordIntegrityTag || undefined,
        encodedDecryptedFilename: encryptionData.encodedFilename ? encoder.encode(encryptionData.encodedFilename) : undefined,
        encodedDecryptedDescription: encryptionData.encodedDescription ? encoder.encode(encryptionData.encodedDescription) : undefined,
        onClose: (result) => {
          //console.log('Decryption result:', result);
          if (result.isThereAnError) {
            console.error('Decryption error:', result.errorMessage);
            setIsDecryptionModalOpen(false);
            setDecryptionProps(null);
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
              userEmail: user.email,
            });

            // Set the downloader visible after a short delay to ensure state is set
            setTimeout(() => {
              setIsDecryptionModalOpen(false);
              setDownloaderVisible(true);
            }, 100);
          }
        },
      };

      // Set states for modal display
      setDecryptionProps(fileDecrypterProps);
      setIsDecryptionModalOpen(true);

    } catch (error) {
      showErrorModal(
        `<p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p> <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`
      );
      console.error('Download failed:', error);
    }
  };

  const handleCloseModal = () => {
    setDownloaderVisible(false);
  };
  
  const handleDeleteBackup = async (projectId: string, backupId: string): Promise<void> => {
    try {
      const user = auth.currentUser;
  
      if (!user) {
        await show_authentication_error();
        throw new Error("User not authenticated");
      }
  
      const userEmail = user.email!;
      const privateBackupPath = `data/${userEmail}/private/encrypted/projectInfo/${projectId}/backups/${backupId}`;
      const nonPrivateBackupPath = `data/${userEmail}/backups/${backupId}`;
  
      // Step 1: Preparing for backup removal
      Swal.fire({
        title: t("preparing_backup_removal"),
        html: `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
        `,
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: { popup: "swal-custom-popup" },
      });
  
      // Step 2: Delete chunks with progress display
      const chunksRef = collection(db, `${nonPrivateBackupPath}/chunks`);
      const chunksSnapshot = await getDocs(chunksRef);
      const totalChunks = chunksSnapshot.size;
  
      if (totalChunks > 0) {
        let deletedChunks = 0;
  
        for (const doc of chunksSnapshot.docs) {
          await deleteDoc(doc.ref);
          deletedChunks++;
  
          const progress = (deletedChunks / totalChunks) * 100;
          Swal.update({
            html: `
              <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t("deleting_chunks")}</p>
              <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t("progress")}: ${progress.toFixed(2)}%</p>
              <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
            `,
            showConfirmButton: false,
          });
  
          await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate delay
        }
      }
  
      // Step 3 and Step 4: Wrapping up - Delete metadata
      Swal.update({
        html: `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t("wrapping_up_backup_removal")}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
        `,
        showConfirmButton: false,
      });
      Swal.showLoading();
  
      // Delete metadata in backups
      await deleteDoc(doc(db, nonPrivateBackupPath));
  
      // Delete private metadata within the project
      await deleteDoc(doc(db, privateBackupPath));
  
      // Update projects hook to remove the deleted backup
      setProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                backups: project.backups.filter((backup) => backup.id !== backupId),
              }
            : project
        )
      );
  
      // Success message
      Swal.close();
      toast.success(t("backup_deleted_successfully"));
    } catch (error) {
      console.error("Error deleting backup:", error);
  
      // Error message
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `;
      
      showErrorModal(errorMessage);
    }
  };

  // Check if Download button should be displayed
  const shouldDisplayDownloadButton = (backup: Backup) => {
    const fileKeyStatus = backup.privateData.randomlyGeneratedFileKey.status;
    const fileSaltStatus = backup.privateData.fileSalt.status;
  
    return fileKeyStatus === "valid" && fileSaltStatus === "valid";
  };

  const handleLogout = async () => {
    // Clear authentication data
    setMasterKey(new Uint8Array(272).fill(Math.floor(Math.random() * 256)));
    setIterations(Math.floor(Math.random() * 100));
    await auth.signOut();
    setIsLoggedIn(false);
    setShowLogoutModal(false);
  
    // Add verification and redirection
    setTimeout(async () => {
      try {
        const currentUser = await auth.currentUser;
        if (!currentUser) {
          onLogout();
        }
      } catch (error) {
        toast.error(t('logout-failed'));
      }
    }, 10);
  };
  
  const closeLogoutModal = () => {
    setShowLogoutModal(false);
  };

  const handleDeleteProject = async (projectId: string): Promise<void> => {
    try {
      const user = auth.currentUser;
  
      if (!user) {
        await show_authentication_error();
        throw new Error("User not authenticated");
      }
  
      const userEmail = user.email!;
      const privateBackupsPath = `data/${userEmail}/private/encrypted/projectInfo/${projectId}/backups`;
      const nonPrivateBackupsPath = `data/${userEmail}/backups`;
  
      // Fetch project-specific backups
      const privateBackupsRef = collection(db, privateBackupsPath);
      const privateBackupsSnapshot = await getDocs(privateBackupsRef);
      const totalBackups = privateBackupsSnapshot.size;
  
      if (totalBackups > 0) {
        let currentBackupIndex = 1; // Start numbering from 1
  
        // Step 1: Show initial loading indicator for project deletion
        Swal.fire({
          title: t("preparing-for-project-removal"),
          html: `
            <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
          `,
          color: "var(--foreground)",
          background: "var(--card-background)",
          width: 640,
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: { popup: "swal-custom-popup" },
          didOpen: () => {
              Swal.showLoading();
          }
        });
  
        // Step 2: Delete each backup sequentially
        for (const backupDoc of privateBackupsSnapshot.docs) {
          const backupId = backupDoc.id;
  
          // Delete chunks for the current backup from non-private path
          const chunksRef = collection(db, `${nonPrivateBackupsPath}/${backupId}/chunks`);
          const chunksSnapshot = await getDocs(chunksRef);
          const totalChunks = chunksSnapshot.size;
  
          let deletedChunks = 0;
  
          if (totalChunks > 0) {
            for (const chunkDoc of chunksSnapshot.docs) {
              await deleteDoc(chunkDoc.ref);
              deletedChunks++;
  
              // Update progress based on chunk deletion
              const progress = ((deletedChunks / totalChunks) * 100).toFixed(2);
              Swal.hideLoading();
              Swal.update({
                title: t("deleting_project"),
                html: `
                  <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t("removing_backup_n_of_m", { currentBackupIndex, totalBackups })}</p>
                  <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("progress")}: ${progress}%</p>
                `,
                showConfirmButton: false,
              });
  
              await new Promise((resolve) => setTimeout(resolve, 10)); // Simulate delay
            }
          }
  
          // Delete metadata for the current backup in non-private path
          await deleteDoc(doc(db, `${nonPrivateBackupsPath}/${backupId}`));
  
          // Delete metadata for the current backup in private path
          await deleteDoc(doc(db, `${privateBackupsPath}/${backupId}`));
  
          // Increment backup index for next iteration
          currentBackupIndex++;
        }
      }
  
      // Step 3: Delete the project itself
      Swal.update({
        html: `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t("wrapping_up_project_removal")}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
        `,
        showConfirmButton: false,
      });
  
      await deleteDoc(doc(db, `data/${userEmail}/private/encrypted/projectInfo/${projectId}`));
  
      // Update projects hook to remove the deleted project
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectId)
      );
  
      // Switch to dashboard tab
      setActiveTab('dashboard');
  
      // Close SweetAlert and show success toast
      Swal.close();
      toast.success(t("project_deleted_successfully"));
    } catch (error) {
      console.error("Error deleting project:", error);
  
      // Error message
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `;
      
      showErrorModal(errorMessage);
    }
  };

  const closeChooseHowToShareBackupModal = () => setIsChooseHowToShareBackupModalOpen(false);

  const openChooseHowToShareBackupModal = (projectId: string, backupId: string) => {
    setSelectedProjectId(projectId);
    setSelectedBackupId(backupId);
    setIsChooseHowToShareBackupModalOpen(true);
  };

  const handleSetBackupPublicFlag = async (
    userEmail: string,
    projectId: string,
    backupId: string
  ) => {
    try {
      const nonPrivateBackupPath = `data/${userEmail}/backups/${backupId}`;
      await setDoc(
        doc(db, nonPrivateBackupPath),
        { isPublic: true }, // Update only the `isPublic` flag
        { merge: true } // Merge with existing data
      );

      // Update the local projects structure
      setProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                backups: project.backups.map((backup) =>
                  backup.id === backupId ? { ...backup, isPublic: true } : backup
                ),
              }
            : project
        )
      );

      //console.log(`Backup ${backupId} is now public.`);
    } catch (error) {
      console.error("Error setting backup public flag:", error);
      const errorMessage = `
      <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
      <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
      showErrorModal(errorMessage);
    }
  };

  const handleChooseHowToShareBackupAction = async (
    actionType: "get-shareable-tag" | "send-to-user",
    projectId: string,
    backupId: string
  ) => {
    if (actionType === "get-shareable-tag") {
      closeChooseHowToShareBackupModal(); // Close modal immediately
      await new Promise((resolve) => setTimeout(resolve, 24));
  
      const selectedProject = projects.find((project) => project.id === projectId);
      if (!selectedProject) {
        console.error("Project not found");
        return;
      }
  
      const selectedBackup = selectedProject.backups.find((backup) => backup.id === backupId);
      if (!selectedBackup) {
        console.error("Backup not found");
        return;
      }
  
      if (selectedBackup.isPublic) {
        confirmSharingBackup(true); // Skip confirmation modal and proceed directly
        return;
      }
  
      setShowShareConfirmationModal(true); // Show confirmation modal before proceeding
    } else if (actionType === "send-to-user") {
      // Open the recipient email modal
      setShowGetRecipientEmailModal(true);
    }
  };
  
  const handleSubmitRecipientEmail = async (email: string) => {
    setRecipientEmail(email); // Save recipient email in state
    //console.log(`Recipient Email Entered: ${email}`);
    const selectedProject = projects.find((project) => project.id === selectedProjectId);
    if (!selectedProject) {
      console.error("Project not found");
      return;
    }
  
    const selectedBackup = selectedProject.backups.find((backup) => backup.id === selectedBackupId);
    if (!selectedBackup) {
      console.error("Backup not found");
      return;
    }
    if (selectedBackup.isPublic) {
      confirmSendingBackup(true); // Skip confirmation modal and proceed directly
      return;
    }
    setShowSendConfirmationModal(true);
  };  

  const confirmSharingBackup = async (confirmed: boolean) => {
    setShowShareConfirmationModal(false);
  
    if (!confirmed) return; // If the user cancels, do nothing
  
    try {
      const user = auth.currentUser;
      if (!user) {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay for authentication check
        await Swal.fire({
          title: t("authentication_error"),
          html: `<p style="margin-bottom:10px;" dir="ltr">${t("please_log_in")}</p>`,
          color: "var(--foreground)",
          background: "var(--card-background)",
          width: 640,
          allowOutsideClick: false,
          customClass: {
            popup: "swal-custom-popup",
          },
        });
        throw new Error("User not authenticated");
      }
  
      const userEmail = user.email!;
  
      //console.log(`Generating shareable tag for Backup ${selectedBackupId}...`);
  
      const selectedProject = projects.find((project) => project.id === selectedProjectId);
      if (!selectedProject) {
        console.error("Project not found");
        return;
      }
  
      const selectedBackup = selectedProject.backups.find(
        (backup) => backup.id === selectedBackupId
      );
      if (!selectedBackup) {
        console.error("Backup not found");
        return;
      }
  
      try {
        // Extract necessary values for tag generation
        const randomlyGeneratedFileKey =
          selectedBackup.privateData.randomlyGeneratedFileKey.value;
        const fileSalt = selectedBackup.privateData.fileSalt.value;
        const metadataSalt = selectedBackup.privateData.metadataSalt.value;
  
        if (!randomlyGeneratedFileKey || !fileSalt || !metadataSalt) {
          console.error("Missing cryptographic data for tag generation");
          return;
        }
  
        Swal.fire({
          title: t("generating_shareable_tag"),
          html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>`,
          color: "var(--foreground)",
          background: "var(--card-background)",
          width: 640,
          allowOutsideClick: false,
          customClass: { popup: "swal-custom-popup" },
          didOpen: () => Swal.showLoading(),
        });
  
        await handleSetBackupPublicFlag(userEmail, selectedProjectId, selectedBackupId); // Set backup public flag and update local structure
  
        await new Promise((resolve) => setTimeout(resolve, 24)); // Wait for smooth transition
  
        // Call the tag generator
        const generatedTag = await TagGenerator({
          masterKey,
          metadataSalt,
          fileSalt,
          randomlyGeneratedFileKey,
          userEmail,
          backupId: selectedBackupId,
          numberOfIterationsForMetadata: iterations,
          numberOfIterationsForFile: iterations,
        });
  
        //console.log("Generated Tag:", generatedTag); // Print the generated tag to the console
  
        Swal.close(); // Close SweetAlert after successful generation
  
        // Open the modal to display the tag
        setGeneratedTag(generatedTag); // Set the tag in state
        setShowDisplayTagModal(true); // Open the display modal
      } catch (error) {
        console.error("Error generating shareable tag:", error);

        const errorMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
        showErrorModal(errorMessage);
      }
    } catch (error) {
      console.error("Error confirming sharing:", error);
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
      showErrorModal(errorMessage);
    }
  };
  
  const confirmSendingBackup = async (confirmed: boolean) => {
    setShowSendConfirmationModal(false);
    if (!confirmed) return; // If the user cancels, do nothing
  
    const selectedProject = projects.find((project) => project.id === selectedProjectId);
    if (!selectedProject) {
      console.error("Project not found");
      return;
    }
  
    const selectedBackup = selectedProject.backups.find((backup) => backup.id === selectedBackupId);
    if (!selectedBackup) {
      console.error("Backup not found");
      return;
    }
  
    try {
      const user = auth.currentUser;
      if (!user) {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay for authentication check
        await Swal.fire({
          title: t("authentication_error"),
          html: `<p style="margin-bottom:10px;" dir="ltr">${t("please_log_in")}</p>`,
          color: "var(--foreground)",
          background: "var(--card-background)",
          width: 640,
          allowOutsideClick: false,
          customClass: { popup: "swal-custom-popup" },
        });
        throw new Error("User not authenticated");
      }
  
      const userEmail = user.email!;
      const randomlyGeneratedFileKey = selectedBackup.privateData.randomlyGeneratedFileKey.value;
      const fileSalt = selectedBackup.privateData.fileSalt.value;
      const metadataSalt = selectedBackup.privateData.metadataSalt.value;
      if (!randomlyGeneratedFileKey || !fileSalt || !metadataSalt) {
        throw new Error("Missing cryptographic data necessary for tag generation.");
      }
  
      await new Promise((resolve) => setTimeout(resolve, 50));
      Swal.fire({
        title: t("generating_shareable_tag"),
        html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>`,
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: { popup: "swal-custom-popup" },
        didOpen: () => Swal.showLoading(),
      });
  
      await handleSetBackupPublicFlag(userEmail, selectedProjectId, selectedBackupId); // Set backup public flag and update local structure
  
      await new Promise((resolve) => setTimeout(resolve, 50));
      const generatedTag = await TagGenerator({
        masterKey,
        metadataSalt,
        fileSalt,
        randomlyGeneratedFileKey,
        userEmail: userEmail,
        backupId: selectedBackupId,
        numberOfIterationsForMetadata: iterations,
        numberOfIterationsForFile: iterations,
      });
  
      const tagArray = await encodeTag(generatedTag);
  
      try {
        Swal.update({
          title: t('sending-backup-tag'),
          html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>`,
          allowOutsideClick: false,
          showConfirmButton: false,
        });
        Swal.showLoading();
  
        const db = getFirestore(); // Initialize Firestore
        const keyRef = doc(db, `data/${recipientEmail}/public`, 'mlkem-public-key'); // Reference to the document named 'mlkem-public-key'
        const keyDoc = await getDoc(keyRef); // Fetch the document snapshot
  
        if (!keyDoc.exists()) {
          const errorMessage = `
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('user-doesnt-exist')}</p>
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('please-verify-users-email')}</p>
            <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('invalid_credentials_line2')}</p>
          `;
          showErrorModal(errorMessage);
          return;
        } else {
          const keyData = keyDoc.data(); // Get data from the document
          if (keyData && 'publicKey' in keyData) { // Check for 'publicKey' field
            const recipientPublicKey = base64ToUint8Array(keyData.publicKey);
            if (recipientPublicKey.length > 1) {
              const encapsulatedSecret = await encapsulateSecret(recipientPublicKey);
              if (!encapsulatedSecret) return; // Ensure encapsulated secret is defined
              const { ct, ssS } = encapsulatedSecret;
              const encryptedTagArray = await silentlyEncryptDataWithTwoCiphersCBC(tagArray, ssS, 125);
              const encryptedTag = btoa(String.fromCharCode(...encryptedTagArray));
              const mlkemCiphertext = btoa(String.fromCharCode(...ct));
              const docRef = doc(collection(db, `data/${recipientEmail}/receivedBackups`));
              const tagData: EncryptedFileTag = { encryptedTag, mlkemCiphertext, sender: userEmail };
              await setDoc(docRef, tagData); // Add sent record into the list
  
              const cutIterations = parseInt((iterations / 4).toString(), 10);
              const derivedKey = masterKey.slice(180);
              const privateEncryptedTagArray = await silentlyEncryptDataWithTwoCiphersCBC(tagArray, derivedKey, cutIterations);
              const privateEncryptedTag = btoa(String.fromCharCode(...privateEncryptedTagArray));
              const docRef1 = doc(collection(db, `data/${user.email}/private/encrypted/sentBackupTags`));
              const tagData1: SentFileTag = { tag: privateEncryptedTag, recipient: recipientEmail };
              await setDoc(docRef1, tagData1);
  
              await new Promise(resolve => setTimeout(resolve, 75));
  
              // Extract necessary information to update the sentBackups hook
              const parts = generatedTag.split(",");
              if (parts.length !== 4) {
                console.error("Invalid tag structure - expected [email,backupID,metadataKey,fileKey]");
                return;
              }
              const [emailPart, backupID, metadataKey, fileKey] = parts;
  
              // Validate components
              const emailBytes = base64ToUint8Array(emailPart);
              const decodedEmail = new TextDecoder().decode(emailBytes);
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (emailRegex.test(decodedEmail) && base64ToUint8Array(fileKey).length === 416 && base64ToUint8Array(metadataKey).length === 672 && new TextEncoder().encode(backupID).length === 10) {
                // Fetch and decrypt backup
                const metadataKeyBytes = base64ToUint8Array(metadataKey);
                const backup = await fetchAndDecryptBackupById(decodedEmail, backupID, metadataKeyBytes);
  
                // Generate a unique local identifier and ensure it doesn't already exist
                let localId = generateUniqueId();
                while (sentBackups.some(backup => backup.localIdentifier === localId)) {
                  localId = generateUniqueId();
                }
  
                // Set the data to the sentBackups hook
                const sharedBackup: SharedBackup = {
                  ...backup,
                  localIdentifier: docRef1.id,
                  owner: decodedEmail,
                  recipient: recipientEmail,
                  tag: generatedTag,
                  id: backupID, // Ensure the id is set
                  privateData: {
                    randomlyGeneratedFileKey: { value: null, integrity: null, status: "absent" },
                    fileSalt: { value: null, integrity: null, status: "absent" },
                    metadataSalt: { value: null, integrity: null, status: "absent" },
                    encryptedTag: { value: null, integrity: null, status: "absent" },
                  },
                  encryptedRecordIntegrityTag: { value: null, integrity: null, status: "absent" },
                };
  
                setSentBackups(prevBackups => {
                  // Remove any existing backup with the same localIdentifier
                  const filteredBackups = prevBackups.filter(b => b.id !== docRef1.id);
                  return [...filteredBackups, sharedBackup];
                });
              } else {
                if (!emailRegex.test(decodedEmail)) console.log('Invalid email');
                if (base64ToUint8Array(fileKey).length !== 416) console.log('Invalid file key');
                if (base64ToUint8Array(metadataKey).length !== 672) console.log('Invalid metadata key');
                if (new TextEncoder().encode(backupID).length !== 10) console.log('Invalid backup ID');
              }
  
              Swal.close();
              toast.success(t("backup_tag_sent_successfully")); // Show success toast
            } else {
              const errorMessage = `
                <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('cant-find-the-recipients-public-key')}</p>
              `;
              showErrorModal(errorMessage);
            }
          }
        }
      } catch (error) {
        console.error('Error sending the file tag:', error);
        const errorMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
        `;
        showErrorModal(errorMessage);
      }
    } catch (error) {
      console.error("Error generating shareable tag:", error);
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `;
      showErrorModal(errorMessage);
    }
  };  
  
  interface EncapsulatedSecret {
      ct: Uint8Array;
      ssS: Uint8Array;
  }

  interface EncryptedFileTag {
    encryptedTag: string;
    mlkemCiphertext: string;
    sender?: string;
  }
  
  interface SentFileTag {
    tag: string;
    recipient: string;
  }

  // Function to encapsulate shared secret using the recipient's public key
  const encapsulateSecret = async (pkR: Uint8Array): Promise<EncapsulatedSecret | undefined> => {
      try {
          const sender = new MlKem1024();
          const [ct, ssS] = await sender.encap(pkR);
          //console.log("Ciphertext (ct):", ct);
          //console.log("Sender Shared Secret (ssS):", ssS);
          return { ct, ssS }; // Return ciphertext and sender's shared secret
      } catch (err) {
          console.error("Failed to encapsulate secret:", (err as Error).message);
      }
  };

  const decapsulateSecret = async (ct: Uint8Array, skR: Uint8Array): Promise<Uint8Array | undefined> => {
    try {
      const recipient = new MlKem1024();
      const ssR = await recipient.decap(ct, skR);
      return ssR;
    } catch (err) {
      console.error("Failed to decapsulate secret:", (err as Error).message);
    }
  };

  // Received backups (Below)
  
  const refreshReceivedBackups = async () => {
    // Initial Swal for fetching backups
    setReceivedBackups([]); // Clear the hook before processing
    await new Promise(resolve => setTimeout(resolve, 24));
    Swal.fire({
        title: t('decrypting_mlkem_private_key_ltr'),
        html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`,
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: { popup: "swal-custom-popup" },
        didOpen: () => Swal.showLoading(),
    });
    await new Promise(resolve => setTimeout(resolve, 24));

    try {
        const user = auth.currentUser;
        if (!user) {
            await new Promise(resolve => setTimeout(resolve, 50));
            await show_authentication_error();
            throw new Error("User not authenticated");
        }
        setIsRefreshingReceivedBackups(true);
        const db = getFirestore();
        const keyRef = doc(db, `data/${user.email}/private/encrypted/keyring`, 'mlkem-private-key');
        const keyDoc = await getDoc(keyRef);
        if (!keyDoc.exists()) {
            const errorMessage = ` <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('cant_access_mlkem_private_key')}</p> <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('max_size_3mb')}</p> `;
            showErrorModal(errorMessage);
            return;
        }

        const keyData = keyDoc.data();
        if (keyData && 'privateKey' in keyData) {
            const encryptedMlKemPrivateKey = base64ToUint8Array(keyData.privateKey);
            const cutIterations = parseInt((iterations / 9).toString(), 10);
            const [decryptedPrivateKey, privateKeyIntegrity] = await decryptFieldValueWithTwoCiphersCBCnoPadding(encryptedMlKemPrivateKey, masterKey, cutIterations);
            if (!privateKeyIntegrity || !decryptedPrivateKey) {
                const errorMessage = `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('decrypted_mlkem_private_key_corrupted')}</p>`;
                showErrorModal(errorMessage);
                return;
            }

            // Update Swal for fetching received backup tags
            await new Promise(resolve => setTimeout(resolve, 24));
            Swal.update({
                title: t('processing_received_backups'),
                html: `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('step_n_of_m', { currentStep: 1, totalSteps: 2 })}</p><p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`,
                allowOutsideClick: false,
                showConfirmButton: false,
                customClass: { popup: "swal-custom-popup" },
            });
            await new Promise(resolve => setTimeout(resolve, 24));

            const tagsRef = collection(db, `data/${user.email}/receivedBackups`);
            const querySnapshot = await getDocs(tagsRef);
            const processedIds = new Set<string>();
            let fileIndex = 0;
            const totalBackups = querySnapshot.docs.length;
            const decryptedTags = [];

            if (totalBackups === 0) {
                setIsBackupExtractionPerformed(true);
                Swal.close();
                return;
            }

            // Phase 1: Extract and decrypt all tags
            for (const doc of querySnapshot.docs) {
                fileIndex++;
                await new Promise(resolve => setTimeout(resolve, 24));
                Swal.update({
                    title: t('processing_received_backups'),
                    html: `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('step_n_of_m', { currentStep: 1, totalSteps: 2 })}</p><p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('decrypting_backup_tag_n_of_m', { currentBackupIndex: fileIndex, totalBackups })}</p><p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    customClass: { popup: "swal-custom-popup" },
                });
                await new Promise(resolve => setTimeout(resolve, 24));

                const data = doc.data();
                if (processedIds.has(doc.id)) continue;

                try {
                    let validity = false;
                    let integrity = false;
                    let decryptedTag: Uint8Array | undefined;

                    if (data.mlkemCiphertext) {
                        const encryptedKey = base64ToUint8Array(data.mlkemCiphertext);
                        if (encryptedKey.length > 1 && encryptedKey.length % 2 === 0) {
                            const decryptionKeySource = await decapsulateSecret(encryptedKey, decryptedPrivateKey);
                            if (decryptionKeySource) {
                                if (data.encryptedTag) {
                                    const encryptedFileTag = base64ToUint8Array(data.encryptedTag);
                                    if (encryptedFileTag.length > 1 && encryptedFileTag.length % 16 === 0) {
                                        const [decryptedWithStreamCipher, integrityCheckPassed] = await decryptFieldValueWithTwoCiphersCBC(encryptedFileTag, decryptionKeySource, 125);
                                        decryptedTag = decryptedWithStreamCipher;
                                        validity = true;
                                        if (integrityCheckPassed) {
                                            integrity = true;
                                            // Decode and print the decrypted tag
                                            const decodedTag = await decodeTag(decryptedTag);
                                            //console.log('Decoded Tag:', decodedTag);
                                            decryptedTags.push({ docId: doc.id, decodedTag, data });
                                        } else {
                                            integrity = false;
                                            console.warn('Broken tag integrity detected.');
                                        }
                                    } else {
                                        validity = false;
                                        integrity = false;
                                        console.warn('Invalid file tag detected.');
                                    }
                                } else {
                                    validity = false;
                                    integrity = false;
                                    console.warn('Missing encrypted tag.');
                                }
                            } else {
                                validity = false;
                                integrity = false;
                                console.warn('Failed to decapsulate secret.');
                            }
                        } else {
                            validity = false;
                            integrity = false;
                            console.warn('Invalid ML-KEM ciphertext detected.');
                        }
                    } else {
                        validity = false;
                        integrity = false;
                        console.warn('Missing ML-KEM ciphertext.');
                    }

                    // Ensure the data is set to the hook even if decryption fails
                    const sharedBackup: SharedBackup = {
                        id: doc.id,
                        privateData: {
                            randomlyGeneratedFileKey: { value: null, integrity: null, status: "absent" },
                            fileSalt: { value: null, integrity: null, status: "absent" },
                            metadataSalt: { value: null, integrity: null, status: "absent" },
                            encryptedTag: { value: null, integrity: null, status: "absent" },
                        },
                        encryptedRecordIntegrityTag: { value: null, integrity: null, status: "absent" },
                        localIdentifier: doc.id,
                        owner: '',
                        sender: data.sender || undefined,
                        tag: '',
                    };
                    setReceivedBackups(prevBackups => [...prevBackups, sharedBackup]);

                } catch (error) {
                    console.error('Error handling received file tag(s):', error);
                    const errorMessage = ` <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p> <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
                    showErrorModal(errorMessage);
                    setIsRefreshingReceivedBackups(false);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            setIsRefreshingReceivedBackups(false);
            // Phase 2: Handle metadata for all decrypted tags
            fileIndex = 0;
            for (const { docId, decodedTag, data } of decryptedTags) {
                fileIndex++;
                await new Promise(resolve => setTimeout(resolve, 24));
                Swal.update({
                    title: t('processing_received_backups'),
                    html: `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('step_n_of_m', { currentStep: 2, totalSteps: 2 })}</p><p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('fetching_and_decrypting_metadata_of_backup_n_of_m', { currentBackupIndex: fileIndex, totalBackups })}</p><p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    customClass: { popup: "swal-custom-popup" },
                });
                await new Promise(resolve => setTimeout(resolve, 24));

                const parts = decodedTag.split(",");
                if (parts.length !== 4) {
                    console.error("Invalid tag structure - expected [email,backupID,metadataKey,fileKey]");
                    continue;
                }

                const [emailPart, backupID, metadataKey, fileKey] = parts;
                // Validate components
                const emailBytes = base64ToUint8Array(emailPart);
                const decodedEmail = new TextDecoder().decode(emailBytes);
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(decodedEmail) && base64ToUint8Array(fileKey).length === 416 && base64ToUint8Array(metadataKey).length === 672 && new TextEncoder().encode(backupID).length === 10) {
                    // Fetch and decrypt backup
                    const metadataKeyBytes = base64ToUint8Array(metadataKey);
                    const backup = await fetchAndDecryptBackupById(decodedEmail, backupID, metadataKeyBytes);

                    // Set the data to the receivedBackups hook
                    const sharedBackup: SharedBackup = {
                        ...backup,
                        localIdentifier: docId,
                        owner: decodedEmail,
                        sender: data.sender || decodedEmail,
                        tag: decodedTag,
                        id: backupID, // Ensure the id is set
                        privateData: {
                            randomlyGeneratedFileKey: { value: null, integrity: null, status: "absent" },
                            fileSalt: { value: null, integrity: null, status: "absent" },
                            metadataSalt: { value: null, integrity: null, status: "absent" },
                            encryptedTag: { value: null, integrity: null, status: "absent" },
                        },
                        encryptedRecordIntegrityTag: { value: null, integrity: null, status: "absent" },
                    };
                    //console.log(sharedBackup)
                    setReceivedBackups(prevBackups => prevBackups.map(b => b.localIdentifier === docId ? sharedBackup : b));
                } else {
                    if (!emailRegex.test(decodedEmail)) console.log('Invalid email');
                    if (base64ToUint8Array(fileKey).length !== 416) console.log('Invalid file key');
                    if (base64ToUint8Array(metadataKey).length !== 672) console.log('Invalid metadata key');
                    if (new TextEncoder().encode(backupID).length !== 10) console.log('Invalid backup ID');
                }
            }

            setIsBackupExtractionPerformed(true);
            Swal.close();
        }
    } catch (error) {
        console.error('Error fetching received backups:', error);
        const errorMessage = ` <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p> <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
        showErrorModal(errorMessage);
    }
  };

  interface FileDecrypterForSharedBackupsProps {
    derivedFileKey: Uint8Array;
    encryptedFileContent: Uint8Array;
    encryptedRecordIntegrityTag?: Uint8Array;
    encodedDecryptedFilename?: Uint8Array;
    encodedDecryptedDescription?: Uint8Array;
    onClose: (result: { decryptedFileContent: Uint8Array; fileIntegrityCompromised: boolean; recordIntegrity: boolean; isThereAnError: boolean; errorMessage: string; }) => void;
  }

  const downloadSharedBackup = async (backupObject: SharedBackup) => {
    const generatedTag = backupObject.tag;
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
    const emailBytes = base64ToUint8Array(emailPart);
    const decodedEmail = new TextDecoder().decode(emailBytes);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
    if (!emailRegex.test(decodedEmail)) throw new Error('Invalid email');
    if (base64ToUint8Array(fileKey).length !== 416) throw new Error('Invalid file key');
    if (base64ToUint8Array(metadataKey).length !== 672) throw new Error('Invalid metadata key');
    if (new TextEncoder().encode(backupID).length !== 10) throw new Error('Invalid backup ID');
  
    try {
      const userEmail = decodedEmail;
      if (!backupObject) {
        throw new Error("System Error: Backup object is missing. Please reload the page and try again.");
      }
      if (!fileKey) {
        throw new Error("System Error: File key is missing. Please try again or use a different backup tag.");
      }
  
      const targetBackup = backupObject;
      const encryptionData = {
        encodedFilename: targetBackup.decryptedResult?.decryptedFilename || null,
        encodedDescription: targetBackup.decryptedResult?.decryptedDescription || null,
        encryptedMetadataTag: targetBackup.encryptedData?.encryptedMetadataTag?.value || null,
        recordIntegrityTag: targetBackup.encryptedRecordIntegrityTag?.value,
      };
  
      const encryptedLength = typeof targetBackup.encryptedSize === 'number' && targetBackup.encryptedSize > 0 ? targetBackup.encryptedSize : null;
      const encryptedFileContent = await downloadBackupChunks(userEmail, backupID, encryptedLength);
  
      // Increment the download count for the local object identified by its localIdentifier
      const updateDownloadCount = (backups: SharedBackup[], localIdentifier: string) => {
        return backups.map(backup =>
          backup.localIdentifier === localIdentifier
            ? { ...backup, downloads: (backup.downloads || 0) + 1 }
            : backup
        );
      };
  
      setSentBackups(prevBackups => updateDownloadCount(prevBackups, targetBackup.localIdentifier));
      setReceivedBackups(prevBackups => updateDownloadCount(prevBackups, targetBackup.localIdentifier));
  
      const encoder = new TextEncoder();
      const fileDecrypterProps: FileDecrypterForSharedBackupsProps = {
        derivedFileKey: base64ToUint8Array(fileKey),
        encryptedFileContent,
        encryptedRecordIntegrityTag: encryptionData.recordIntegrityTag || undefined,
        encodedDecryptedFilename: encryptionData.encodedFilename ? encoder.encode(encryptionData.encodedFilename) : undefined,
        encodedDecryptedDescription: encryptionData.encodedDescription ? encoder.encode(encryptionData.encodedDescription) : undefined,
        onClose: (result) => {
          if (result.isThereAnError) {
            console.error('Decryption error:', result.errorMessage);
            setIsDecryptModalForSharedBackup(false);
            setDecryptionPropsForSharedBackup(null);
            showErrorModal(
              `<p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
               <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`
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
        `<p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
         <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`
      );
      console.error('Download failed:', error);
    }
  };  

  const closeDownloadModalForSharedBackup = () => {
    setDownloaderForSharedBackup(false);
  };

  const deleteReceivedBackup = async (backup: SharedBackup): Promise<void> => {
    try {
      const user = auth.currentUser;
  
      if (!user) {
        await show_authentication_error();
        throw new Error("User not authenticated");
      }
  
      const userEmail = user.email!;
      const backupId = backup.localIdentifier;
      const localIdentifier = backup.localIdentifier;
  
      // Show a single SweetAlert notification
      Swal.fire({
        title: t("deleting-received-backup"),
        html: `
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
        `,
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: { popup: "swal-custom-popup" },
        didOpen: () => { Swal.showLoading(); },
      });
  
      // Delete the backup from Firebase
      await deleteDoc(doc(db, `data/${userEmail}/receivedBackups/${backupId}`));
  
      // Update receivedBackups hook to remove the deleted backup
      setReceivedBackups((prevBackups) =>
        prevBackups.filter((b) => b.localIdentifier !== localIdentifier)
      );
      setTotalReceivedBackups(receivedBackups.length.toString());
      // Close the SweetAlert
      Swal.close();
  
      // Success message
      toast.success(t("backup_deleted_successfully"));
    } catch (error) {
      console.error("Error deleting backup:", error);
  
      // Close the SweetAlert
      Swal.close();
  
      // Error message
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `;
  
      showErrorModal(errorMessage);
    }
  };

  // Received backups (Above)

  const onShareBackup = async (backup: SharedBackup, recipientEmail: string, tag: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay for authentication check
        await Swal.fire({
          title: t("authentication_error"),
          html: `<p style="margin-bottom:10px;" dir="ltr">${t("please_log_in")}</p>`,
          color: "var(--foreground)",
          background: "var(--card-background)",
          width: 640,
          allowOutsideClick: false,
          customClass: { popup: "swal-custom-popup" },
        });
        throw new Error("User not authenticated");
      }
      const userEmail = user.email!;
      //console.log(`Generated Tag for Recipient Email ${recipientEmail}:`, generatedTag);
      const tagArray = await encodeTag(tag);
      try {
        Swal.fire({
          title: t('sending-backup-tag'),
          html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`,
          color: "var(--foreground)",
          background: "var(--card-background)",
          width: 640,
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: { popup: "swal-custom-popup" },
          didOpen: () => Swal.showLoading(),
        });
  
        const db = getFirestore(); // Initialize Firestore
        const keyRef = doc(db, `data/${recipientEmail}/public`, 'mlkem-public-key'); // Reference to the document named 'mlkem-public-key'
        const keyDoc = await getDoc(keyRef); // Fetch the document snapshot
        //console.log(`data/${recipientEmail}/public/mlkem-public-key`);
        if (!keyDoc.exists()) {
          const errorMessage = `
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('user-doesnt-exist')}</p>
            <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('please-verify-users-email')}</p>
            <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('invalid_credentials_line2')}</p>
          `;
          showErrorModal(errorMessage);
          return;
        } else {
          const keyData = keyDoc.data(); // Get data from the document
          if (keyData && 'publicKey' in keyData) { // Check for 'publicKey' field
            const recipientPublicKey = base64ToUint8Array(keyData.publicKey);
            if (recipientPublicKey.length > 1) {
              //console.log(recipientPublicKey);
              const encapsulatedSecret = await encapsulateSecret(recipientPublicKey);
              if (!encapsulatedSecret) return; // Ensure encapsulated secret is defined
              const { ct, ssS } = encapsulatedSecret;
              const encryptedTagArray = await silentlyEncryptDataWithTwoCiphersCBC(tagArray, ssS, 125);
              //const [decryptedFileNameArray, integrity, paddingValidity] = await decryptStringWithTwoCiphersCBC(encryptedTag, ssS, 100);
              //console.log(encryptedTagArray);
              //console.log(ct);
              const encryptedTag = btoa(String.fromCharCode(...encryptedTagArray));
              const mlkemCiphertext = btoa(String.fromCharCode(...ct));
              const docRef = doc(collection(db, `data/${recipientEmail}/receivedBackups`));
              const tagData: EncryptedFileTag = { encryptedTag, mlkemCiphertext, sender: userEmail };
              await setDoc(docRef, tagData); // Add sent record into the list
  
              const cutIterations = parseInt((iterations / 4).toString(), 10);
              const derivedKey = masterKey.slice(180);
              const privateEncryptedTagArray = await silentlyEncryptDataWithTwoCiphersCBC(tagArray, derivedKey, cutIterations);
              const privateEncryptedTag = btoa(String.fromCharCode(...privateEncryptedTagArray));
              const docRef1 = doc(collection(db, `data/${user.email}/private/encrypted/sentBackupTags`));
              const tagData1: SentFileTag = { tag: privateEncryptedTag, recipient: recipientEmail };
              await setDoc(docRef1, tagData1);
  
              await new Promise(resolve => setTimeout(resolve, 25));
  
              const parts = tag.split(",");
              if (parts.length !== 4) {
                console.error("Invalid tag structure - expected [email,backupID,metadataKey,fileKey]");
                return;
              }
              const [emailPart, backupID, metadataKey, fileKey] = parts;
  
              // Validate components
              const emailBytes = base64ToUint8Array(emailPart);
              const decodedEmail = new TextDecoder().decode(emailBytes);
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (emailRegex.test(decodedEmail) && base64ToUint8Array(fileKey).length === 416 && base64ToUint8Array(metadataKey).length === 672 && new TextEncoder().encode(backupID).length === 10) {
                // Fetch and decrypt backup
                const metadataKeyBytes = base64ToUint8Array(metadataKey);
                const backup = await fetchAndDecryptBackupById(decodedEmail, backupID, metadataKeyBytes);
  
                // Generate a unique local identifier and ensure it doesn't already exist
                let localId = generateUniqueId();
                while (sentBackups.some(backup => backup.localIdentifier === localId)) {
                  localId = generateUniqueId();
                }
                // Set the data to the sentBackups hook
                const sharedBackup: SharedBackup = {
                  ...backup,
                  localIdentifier: docRef1.id,
                  owner: decodedEmail,
                  recipient: recipientEmail,
                  tag: tag,
                  id: backupID, // Ensure the id is set
                  privateData: {
                    randomlyGeneratedFileKey: { value: null, integrity: null, status: "absent" },
                    fileSalt: { value: null, integrity: null, status: "absent" },
                    metadataSalt: { value: null, integrity: null, status: "absent" },
                    encryptedTag: { value: null, integrity: null, status: "absent" },
                  },
                  encryptedRecordIntegrityTag: { value: null, integrity: null, status: "absent" },
                };
  
                setSentBackups(prevBackups => {
                  // Remove any existing backup with the same localIdentifier
                  const filteredBackups = prevBackups.filter(b => b.id !== docRef1.id);
                  return [...filteredBackups, sharedBackup];
                });
  
                Swal.close();
                toast.success(t("backup_tag_sent_successfully")); // Show success toast
              } else {
                if (!emailRegex.test(decodedEmail)) console.log('Invalid email');
                if (base64ToUint8Array(fileKey).length !== 416) console.log('Invalid file key');
                if (base64ToUint8Array(metadataKey).length !== 672) console.log('Invalid metadata key');
                if (new TextEncoder().encode(backupID).length !== 10) console.log('Invalid backup ID');
              }
            } else {
              const errorMessage = `
                <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('cant-find-the-recipients-public-key')}</p>
              `;
              showErrorModal(errorMessage);
            }
          } else {
            const errorMessage = `
              <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('cant-find-the-recipients-public-key')}</p>
            `;
            showErrorModal(errorMessage);
          }
        }
      } catch (error) {
        console.error('Error sending the file tag:', error);
        const errorMessage = `
          <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
        `;
        showErrorModal(errorMessage);
      }
    } catch (error) {
      console.error("Error generating shareable tag:", error);
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `;
      showErrorModal(errorMessage);
    }
  };

  const refreshSentBackups = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        await new Promise(resolve => setTimeout(resolve, 50));
        await show_authentication_error();
        throw new Error("User not authenticated");
      }
      setSentBackups([]); // Clear the hook before processing
      await new Promise(resolve => setTimeout(resolve, 24));
      Swal.fire({
        title: t('processing_sent_backups'),
        html: `<p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`,
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: { popup: "swal-custom-popup" },
        didOpen: () => Swal.showLoading(),
      });
      await new Promise(resolve => setTimeout(resolve, 24));
  
      const db = getFirestore();
      const tagsRef = collection(db, `data/${user.email}/private/encrypted/sentBackupTags`);
      const querySnapshot = await getDocs(tagsRef);
      const processedIds = new Set<string>();
      let fileIndex = 0;
      const totalBackups = querySnapshot.docs.length;
      const decryptedTags = [];
  
      if (totalBackups === 0) {
        setIsBackupExtractionPerformed(true);
        Swal.close();
        return;
      }
  
      // Phase 1: Extract and decrypt all tags
      for (const doc of querySnapshot.docs) {
        fileIndex++;
        await new Promise(resolve => setTimeout(resolve, 24));
        Swal.update({
          title: t('processing_sent_backups'),
          html: `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('step_n_of_m', { currentStep: 1, totalSteps: 2 })}</p><p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('decrypting_backup_tag_n_of_m', { currentBackupIndex: fileIndex, totalBackups })}</p><p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`,
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: { popup: "swal-custom-popup" },
        });
        await new Promise(resolve => setTimeout(resolve, 24));
  
        const data = doc.data();
        if (processedIds.has(doc.id)) continue;
  
        try {
          let validity = false;
          let integrity = false;
          let decryptedTag: Uint8Array | undefined;
          if (data.tag) {
            const encryptedFileTag = base64ToUint8Array(data.tag);
            if (encryptedFileTag.length > 1 && encryptedFileTag.length % 16 === 0) {
              const cutIterations = parseInt((iterations / 4).toString(), 10);
              const derivedKey = masterKey.slice(180);
              const [decryptedWithStreamCipher, integrityCheckPassed] = await decryptFieldValueWithTwoCiphersCBC(encryptedFileTag, derivedKey, cutIterations);
              decryptedTag = decryptedWithStreamCipher;
              validity = true;
              if (integrityCheckPassed) {
                integrity = true;
                // Decode and print the decrypted tag
                const decodedTag = await decodeTag(decryptedTag);
                //console.log('Decoded Tag:', decodedTag);
                decryptedTags.push({ docId: doc.id, decodedTag, data });
              } else {
                integrity = false;
                console.warn('Broken tag integrity detected.');
              }
            } else {
              validity = false;
              integrity = false;
              console.warn('Invalid file tag detected.');
            }
          } else {
            validity = false;
            integrity = false;
            console.warn('Missing encrypted tag.');
          }

          const sharedBackup: SharedBackup = {
            id: doc.id,
            privateData: {
              randomlyGeneratedFileKey: { value: null, integrity: null, status: "absent" },
              fileSalt: { value: null, integrity: null, status: "absent" },
              metadataSalt: { value: null, integrity: null, status: "absent" },
              encryptedTag: { value: null, integrity: null, status: "absent" },
            },
            encryptedRecordIntegrityTag: { value: null, integrity: null, status: "absent" },
            localIdentifier: doc.id, // Use the generated unique local identifier
            owner: '',
            recipient: data.recipient || undefined,
            tag: '',
          };
          setSentBackups(prevBackups => [...prevBackups, sharedBackup]);
        } catch (error) {
          console.error('Error handling sent file tag(s):', error);
          const errorMessage = ` <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p> <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
          showErrorModal(errorMessage);
        }
      }
  
      // Phase 2: Handle metadata for all decrypted tags
      fileIndex = 0;
      for (const { docId, decodedTag, data } of decryptedTags) {
        fileIndex++;
        await new Promise(resolve => setTimeout(resolve, 24));
        Swal.update({
          title: t('processing_sent_backups'),
          html: `<p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('step_n_of_m', { currentStep: 2, totalSteps: 2 })}</p><p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('fetching_and_decrypting_metadata_of_backup_n_of_m', { currentBackupIndex: fileIndex, totalBackups })}</p><p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>`,
          allowOutsideClick: false,
          showConfirmButton: false,
          customClass: { popup: "swal-custom-popup" },
        });
        await new Promise(resolve => setTimeout(resolve, 24));
  
        const parts = decodedTag.split(",");
        if (parts.length !== 4) {
          console.error("Invalid tag structure - expected [email,backupID,metadataKey,fileKey]");
          continue;
        }
        const [emailPart, backupID, metadataKey, fileKey] = parts;
  
        // Validate components
        const emailBytes = base64ToUint8Array(emailPart);
        const decodedEmail = new TextDecoder().decode(emailBytes);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(decodedEmail) && base64ToUint8Array(fileKey).length === 416 && base64ToUint8Array(metadataKey).length === 672 && new TextEncoder().encode(backupID).length === 10) {
          // Fetch and decrypt backup
          const metadataKeyBytes = base64ToUint8Array(metadataKey);
          const backup = await fetchAndDecryptBackupById(decodedEmail, backupID, metadataKeyBytes);
          // Set the data to the sentBackups hook
          const sharedBackup: SharedBackup = {
            ...backup,
            localIdentifier: docId,
            owner: decodedEmail,
            recipient: data.recipient || decodedEmail,
            tag: decodedTag,
            id: backupID, // Ensure the id is set
            privateData: {
              randomlyGeneratedFileKey: { value: null, integrity: null, status: "absent" },
              fileSalt: { value: null, integrity: null, status: "absent" },
              metadataSalt: { value: null, integrity: null, status: "absent" },
              encryptedTag: { value: null, integrity: null, status: "absent" },
            },
            encryptedRecordIntegrityTag: { value: null, integrity: null, status: "absent" },
          };
  
          setSentBackups(prevBackups => {
            // Remove any existing backup with the same localIdentifier
            const filteredBackups = prevBackups.filter(b => b.id !== docId);
            return [...filteredBackups, sharedBackup];
          });
        } else {
          if (!emailRegex.test(decodedEmail)) console.log('Invalid email');
          if (base64ToUint8Array(fileKey).length !== 416) console.log('Invalid file key');
          if (base64ToUint8Array(metadataKey).length !== 672) console.log('Invalid metadata key');
          if (new TextEncoder().encode(backupID).length !== 10) console.log('Invalid backup ID');
        }
      }
  
      setIsBackupExtractionPerformed(true);
      Swal.close();
    } catch (error) {
      console.error('Error fetching sent backups:', error);
      const errorMessage = ` <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p> <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>`;
      showErrorModal(errorMessage);
    }
  };
  
  const deleteSentBackup = async (backup: SharedBackup): Promise<void> => {
    try {
      const user = auth.currentUser;
  
      if (!user) {
        await show_authentication_error();
        throw new Error("User not authenticated");
      }
  
      const userEmail = user.email!;
      const backupId = backup.localIdentifier;
      const localIdentifier = backup.localIdentifier;
  
      // Show a single SweetAlert notification
      Swal.fire({
        title: t("deleting-sent-backup"),
        html: `
          <p dir="${isRTL ? 'rtl' : 'ltr'}">${t("please_wait")}</p>
        `,
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: { popup: "swal-custom-popup" },
        didOpen: () => { Swal.showLoading(); },
      });
  
      // Delete the backup from Firebase
      await deleteDoc(doc(db, `data/${userEmail}/private/encrypted/sentBackupTags/${backupId}`));
  
      // Update sentBackups hook to remove the deleted backup
      setSentBackups((prevBackups) =>
        prevBackups.filter((b) => b.localIdentifier !== localIdentifier)
      );
  
      // Close the SweetAlert
      Swal.close();
  
      // Success message
      toast.success(t("backup_reference_deleted_successfully"));
    } catch (error) {
      console.error("Error deleting backup:", error);
  
      // Close the SweetAlert
      Swal.close();
  
      // Error message
      const errorMessage = `
        <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('something_went_wrong_line1')}</p>
        <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('check_the_console')}</p>
      `;
  
      showErrorModal(errorMessage);
    }
  };  

  return (
    <>
    {refreshModalShown && (
      <RefreshConfirmationPopUp
        showConfirmPopUp={refreshModalShown}
        onConfirm={refreshAllBackups}
        onCancel={handleRefreshUsersOwnProjects}
        confirmText={t("yes-button-inscription")}
        cancelText={t("no-button-inscription")}
        messageText={t('projects_will_refresh')}
        secondLineText={t('refresh_shared_received_backups_prompt')}
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

        />
      )}
    {showGetRecipientEmailModal && (
      <GetRecipientEmail
        onClose={() => setShowGetRecipientEmailModal(false)}
        onSubmit={handleSubmitRecipientEmail}
      />
    )}
    {showDisplayTagModal && generatedTag && (
      <DisplayShareableTagForBackup
        shareableTag={generatedTag}
        onClose={() => setShowDisplayTagModal(false)} // Close modal callback
      />
    )}
    {showShareConfirmationModal && (
      <ConfirmationPopUp
        showConfirmPopUp={showShareConfirmationModal}
        onConfirm={() => confirmSharingBackup(true)}
        onCancel={() => confirmSharingBackup(false)}
        confirmText={t("yes-button-inscription")}
        cancelText={t("no-button-inscription")}
        messageText={t('sharing-backup-public-warning-message')}
        secondLineText={t('are-you-sure-you-want-to-proceed')}
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
    {showSendConfirmationModal && (
      <ConfirmationPopUp
        showConfirmPopUp={showSendConfirmationModal}
        onConfirm={() => confirmSendingBackup(true)}
        onCancel={() => confirmSendingBackup(false)}
        confirmText={t("yes-button-inscription")}
        cancelText={t("no-button-inscription")}
        messageText={t('sharing-backup-public-warning-message')}
        secondLineText={t('are-you-sure-you-want-to-proceed')}
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
    {downloaderVisible && backupState.backup && (
      <DownloadFileModal
        backup={backupState.backup}
        fileIntegrityCompromised={backupState.integrityChecks?.fileIntegrityCompromised || false}
        recordIntegrity={backupState.integrityChecks?.recordIntegrity || false}
        decryptedFileContent={backupState.decryptedFileContent}
        messagesListHeader={t("backup-state")}
        firstButtonText={t("save-as")}
        secondButtonText={t("close")}
        onClose={handleCloseModal}
        userEmail={backupState.userEmail || ""}
      />
    )}
    {isBackupDetailsModalOpen && currentBackupDetails && (
      <DecryptModal
        headline={t("backup-details")}
        backup={currentBackupDetails} // Renamed from selectedBackup
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
        displayFirstButton={shouldDisplayDownloadButton(currentBackupDetails)} // Conditional display logic
      />
    )}
      {isDecryptionModalOpen && decryptionProps && (
        <FileDecrypter {...decryptionProps} />
      )}
    <NewProjectModal 
      isOpen={isNewProjectModalOpen} 
      onClose={handleNewProjectClose} 
    />
    <FileCatcher
      isOpen={isFileCatcherOpen}
      onFileProcessed={handleFileProcessingResult}
      projectId={activeProjectId}
    />
    {isEncrypterOpen &&
    <FileEncrypter
      file={selectedFileForFileEncrypter}
      masterKey={masterKey}
      numberOfIterationsForArgon2={iterations}
      onClose={handleFileEncrypterClose}
      isOpen={isEncrypterOpen}
    />
    }
    {isChooseHowToShareBackupModalOpen && (
      <ChooseHowToShareBackupModal
        onClose={closeChooseHowToShareBackupModal}
        onAction={handleChooseHowToShareBackupAction}
        projectId={selectedProjectId}
        backupId={selectedBackupId}
      />
    )}
    <ConfirmationPopUp
      showConfirmPopUp={showLogoutModal}
      onConfirm={handleLogout}
      onCancel={closeLogoutModal}
      confirmText={t('yes-button-inscription')}
      cancelText={t('no-button-inscription')}
      messageText={t('are-you-sure-you-want-to-log-out')}
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
    <div className={`flex ${isRTL ? "flex-row-reverse" : ""} bg-[var(--background)] h-screen text-[var(--foreground)]`}>
      <UnfoldingSidebar
        logo="/logo.webp"
        appName={t("app-name")}
        sections={[
          {
            title: t("my-projects"),
            components: projects.map((project) => ({
              id: project.id,
              name: project.name,
              integrity: project.integrity,
            })),
          },
          {
            title: t("miscellaneous"),
            components: [
              { id: 'received-backups', name: t('received-backups') },
              { id: 'sent-backups', name: t('sent-backups') },
            ],
          },
        ]}
        onComponentClick={(componentId) => setActiveTab(componentId)}
        onAppNameClick={() => setActiveTab('dashboard')}
        unfoldIcon={<IconBorderRightPlus />}
        foldIcon={<IconFoldDown />}
        foldIconRotation={90}
        unfoldIconRotation={0}
        iconColor="var(--foreground)"
        iconHoverColor="var(--foreground)"
        backgroundColor="var(--navbar-background)"
        headerBackgroundColor="var(--navbar-background)"
        textColor="var(--foreground)"
        activeTextColor="var(--foreground)"
        hoverBackgroundColor="var(--lightened-background-adjacent-color)"
        activeBackgroundColor="var(--second-theme-color)"
        sidebarWidth="312px"
        collapsedWidth="54px"
        headerHeight="68px"
        rightStripeColor="var(--card-background)"
        rightStripeHoverColor="var(--lightened-background-adjacent-color)"
        itemBorderRadius="0"
        appNameColor="var(--foreground)"
        sectionTitleColor="var(--foreground)"
        componentFontSize="14px"
        isRTL={isRTL}
      />
      <div className="flex-1 flex flex-col bg-background">
        <div className="flex justify-between h-[69px] items-center p-4" style={{ backgroundColor: 'var(--navbar-background)', padding: '1rem 2rem', borderBottom: '1px solid var(--background-adjacent-color)' }}>
          <div className={`text-[var(--foreground)] text-xl ${isRTL ? 'order-2' : 'order-1'}`}>{userEmail}</div>
          <div className={`flex ${isRTL ? 'order-1' : 'order-2'}`}>
            {isRTL ? (
              <>
                <FancyNavbar items={[{ icon: <IconLogout2 width={26} height="auto" />, label: t('log-out-the-verb') }]} onItemClick={() => {setShowLogoutModal(true)}} activeIconColor="var(--foreground)" backgroundColor="var(--navbar-background)" foregroundColor="var(--second-theme-color)" removeTooltipOnClick={true} />
                <FancyNavbar items={[{ icon: <LanguageIcon width={26} />, label: "Language" }]} onItemClick={() => setIsLanguageSelectorOpen(true)} activeIconColor="var(--foreground)" backgroundColor="var(--navbar-background)" foregroundColor="var(--first-theme-color)" removeTooltipOnClick={true} />
              </>
            ) : (
              <>
                <FancyNavbar items={[{ icon: <LanguageIcon width={26} />, label: "Language" }]} onItemClick={() => setIsLanguageSelectorOpen(true)} activeIconColor="var(--foreground)" backgroundColor="var(--navbar-background)" foregroundColor="var(--first-theme-color)" removeTooltipOnClick={true} />
                <FancyNavbar items={[{ icon: <IconLogout width={26} height="auto" />, label: t('log-out-the-verb') }]} onItemClick={() => {setShowLogoutModal(true)}} activeIconColor="var(--foreground)" backgroundColor="var(--navbar-background)" foregroundColor="var(--second-theme-color)" removeTooltipOnClick={true} />
              </>
            )}
          </div>
        </div>
        <div className="flex-1 p-8 overflow-y-auto" ref={containerRef}>
          {activeTab === 'dashboard' && (
            <>
            <DashboardContent
              totalProjects={totalProjects}
              totalBackups={totalBackups}
              totalBackupSize={totalBackupSize}
              receivedBackups={totalReceivedBackups}
              onCreateProject={() => {
                setIsNewProjectModalOpen(true);
              }}
            />
            <div className="pt-10 pb-6 text-center"> {/* Padding and margin for spacing */}
            <span 
              onClick={handleRefresh} 
              className="text-[var(--refresh-inscription-color)] cursor-pointer"
            >
              {t('refresh')}
            </span>
          </div>
          </>
          )}
          {activeTab === 'received-backups' && (
            <>
              <h2 className={`text-2xl font-bold mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('received-backups')}
              </h2>
              {!isBackupExtractionPerformed ? (
                <>
                  <p className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('no_backups_loaded')}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <HalomotButton
                      text={t('load_backups')}
                      onClick={refreshReceivedBackups}
                      gradient={
                        isRTL
                          ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))'
                          : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
                      }
                      fillWidth={true}
                    />
                  </div>
                </>
              ) : receivedBackups.length === 0 ? (
                <>
                  <p className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('no-received-backups')}
                  </p>
                  <div className="pt-8 pb-6 text-center">
                    <span
                      onClick={refreshReceivedBackups}
                      className="text-[var(--refresh-inscription-color)] cursor-pointer"
                    >
                      {t('refresh')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <ReceivedBackupsComponent
                    backups={receivedBackups}
                    onDeleteBackup={deleteReceivedBackup}
                    onDownloadBackup={downloadSharedBackup}
                    onShareBackup={onShareBackup}
                  />
                  <div className="pt-10 pb-6 text-center">
                    <span
                      onClick={refreshReceivedBackups}
                      className="text-[var(--refresh-inscription-color)] cursor-pointer"
                    >
                      {t('refresh')}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
          {activeTab === 'sent-backups' && (
            <>
              <h2 className={`text-2xl font-bold mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('sent-backups')}
              </h2>
              {!isBackupExtractionPerformed ? (
                <>
                  <p className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('no_backups_loaded')}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <HalomotButton
                      text={t('load_backups')}
                      onClick={refreshSentBackups}
                      gradient={
                        isRTL
                          ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))'
                          : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
                      }
                      fillWidth={true}
                    />
                  </div>
                </>
              ) : sentBackups.length === 0 ? (
                <>
                  <p className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('no-sent-backups')}
                  </p>
                  <div className="pt-8 pb-6 text-center">
                    <span onClick={refreshSentBackups} className="text-[var(--refresh-inscription-color)] cursor-pointer">
                      {t('refresh')}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <SentBackupsComponent backups={sentBackups} onDeleteBackup={deleteSentBackup} onDownloadBackup={downloadSharedBackup} onShareBackup={onShareBackup} />
                  <div className="pt-10 pb-6 text-center">
                    <span onClick={refreshSentBackups} className="text-[var(--refresh-inscription-color)] cursor-pointer">
                      {t('refresh')}
                    </span>
                  </div>
                </>
              )}
            </>
          )}

          {projects.map((project) => (
            <React.Fragment key={project.id}>
              {activeTab === project.id && (
                <div key={project.id}>
                  <BackupTable 
                    project={project} 
                    onDeleteBackup={(projectId, backupId) => {
                      handleDeleteBackup(projectId, backupId);
                    }}
                    onDownloadBackup={(backupId) => {
                      handleDownloadBackup(backupId);
                    }}
                    onShareBackup={(projectId, backupId) => {
                      openChooseHowToShareBackupModal(projectId, backupId)
                    }}
                    onDeleteProject={(projectId) => {
                      handleDeleteProject(projectId);
                    }}
                    onViewBackupDetails={handleViewBackupDetails}
                    onCreateNewBackup={handleCreateNewBackup}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      <LanguageSelector isOpen={isLanguageSelectorOpen} onClose={() => setIsLanguageSelectorOpen(false)} />
    </div>
    </>
  );
};

export default Dashboard;