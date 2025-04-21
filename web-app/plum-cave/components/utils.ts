import { Backup } from "./types"; // Import your Backup type

  /**
   * Function to evaluate the overall integrity of a backup.
   * @param backup - The backup object to evaluate.
   * @param t - Translation function.
   * @returns Array of messages with success flags.
   */
  export const evaluateBackupIntegrity = (backup: Backup, t: (key: string) => string): { text: string; success: boolean }[] => {
    const integrityStatus: { text: string; success: boolean }[] = [];

    const {
      privateData,
      decryptedResult,
      encryptedData,
    } = backup;

    // ===== Check Randomly Generated File Key =====
    const fileKey = privateData.randomlyGeneratedFileKey;
    if (!fileKey.value) {
      integrityStatus.push({ text: t("file-key-missing"), success: false });
    } else if (fileKey.status === "corrupted") {
      integrityStatus.push({ text: t("file-key-corrupt"), success: false });
    } else if (fileKey.value.length !== 656) {
      integrityStatus.push({ text: t("file-key-invalid-length"), success: false });
    }

    // ===== Check File Salt =====
    const fileSalt = privateData.fileSalt;
    if (!fileSalt.value) {
      integrityStatus.push({ text: t("file-salt-missing"), success: false });
    } else if (fileSalt.status === "corrupted") {
      integrityStatus.push({ text: t("file-salt-corrupt"), success: false });
    } else if (fileSalt.value.length !== 48) {
      integrityStatus.push({ text: t("file-salt-invalid-length"), success: false });
    }

    // ===== Check Metadata Salt =====
    const metadataSalt = privateData.metadataSalt;
    if (!metadataSalt.value) {
      integrityStatus.push({ text: t("metadata-salt-missing"), success: false });
    } else if (metadataSalt.status === "corrupted") {
      integrityStatus.push({ text: t("metadata-salt-corrupt"), success: false });
    } else if (metadataSalt.value.length !== 48) {
      integrityStatus.push({
        text: t("metadata-salt-invalid-length"),
        success: false,
      });
    }

    // ===== Check Cryptographic Verification Tag =====
    const encryptedTag = privateData.encryptedTag;

    if (!encryptedTag.value || encryptedTag.status === "absent") {
      integrityStatus.push({
        text: t("missing-crypto-tag-error"),
        success: false,
      });
    } else if (encryptedTag.status === "corrupted") {
      integrityStatus.push({
        text: t("crypto-tag-corrupt-error"),
        success: false,
      });
    } else if (encryptedTag.integrity === false) {
      integrityStatus.push({
        text: t("crypto-tag-integrity-error"),
        success: false,
      });
    }

    // ===== Check Filename Integrity =====
    const filenameIntegrity = decryptedResult?.filenameIntegrity ?? null;
    const encryptedFilename = encryptedData?.encryptedFilename?.value ?? null;

    if (filenameIntegrity !== null && !filenameIntegrity) {
      integrityStatus.push({
        text: t("filename-integrity-error"),
        success: false,
      });
    }
    if (!encryptedFilename) {
      integrityStatus.push({
        text: t("missing-filename-error"),
        success: false,
      });
    }

    // ===== Check Description Integrity =====
    const descriptionIntegrity = decryptedResult?.descriptionIntegrity ?? null;
    const encryptedDescription = encryptedData?.encryptedDescription?.value ?? null;
    const encryptedMetadataTag = encryptedData?.encryptedMetadataTag?.value ?? null;

    if (descriptionIntegrity !== null && !descriptionIntegrity) {
      integrityStatus.push({
        text: t("description-integrity-error"),
        success: false,
      });
    }
    
    // Handle cases where one of `encryptedDescription` or `encryptedMetadataTag` is missing
    if (encryptedMetadataTag && !encryptedDescription) {
      integrityStatus.push({
        text: t("missing-description-error"),
        success: false,
      });
    }
    
    if (encryptedDescription && !encryptedMetadataTag) {
      integrityStatus.push({
        text: t("missing-metadata-tag-error"),
        success: false,
      });
    }

    // ===== Check Metadata Integrity =====
    const metadataIntegrity = decryptedResult?.metadataIntegrity ?? null;

    if (metadataIntegrity !== null && !metadataIntegrity) {
      integrityStatus.push({
        text: t("metadata-integrity-error"),
        success: false,
      });
    }

    // Special case for filename-only presence
    const decryptedFilename = decryptedResult?.decryptedFilename ?? null;
    const decryptedDescription = decryptedResult?.decryptedDescription ?? null;

    if (decryptedFilename && !decryptedDescription && metadataIntegrity === null && fileKey.status === "valid" && metadataSalt.status === "valid") {
      if (filenameIntegrity) {
        integrityStatus.push({ text: t("metadata-integrity-success"), success: true });
      }
    } else if (
      fileKey.status === "valid" &&
      fileSalt.status === "valid" &&
      metadataSalt.status === "valid" &&
      filenameIntegrity &&
      descriptionIntegrity &&
      metadataIntegrity
    ) {
      return [{ text: t("metadata-integrity-success"), success: true }];
    }

    return integrityStatus;
  };

  /**
   * Function to generate a human-readable file size string.
   * @param sizeInBytes - File size in bytes.
   * @returns Human-readable file size string.
   */
  export const generateFileSizeString = (sizeInBytes: number): string => {
    if (sizeInBytes >= 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (sizeInBytes >= 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (sizeInBytes >= 1024) {
      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else if (sizeInBytes === 1) {
      return `1 byte`;
    } else {
      return `${sizeInBytes.toFixed(0)} bytes`;
    }
  };

  export const formatDate = (date: Date, language: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      hour12: true,
    };
    let formattedDate = new Intl.DateTimeFormat(language === 'he' ? 'he-IL' : language === 'es_ar' ? 'es-AR' : 'en-US', options).format(date);
    if (language === 'he') {
      formattedDate = formattedDate
        .replace('AM', 'לפי')
        .replace('PM', 'אחי')
        .replace('לפני חצות', 'לפי')
        .replace('אחר חצות', 'אחי')
        .replace('לפנה׳׳צ', 'לפי')
        .replace('אחה׳׳צ', 'אחי')
        .replace('לפנהייצ', 'לפי')
        .replace('אחהייצ', 'אחי');
    }
    // Remove leading zero from hour if present
    formattedDate = formattedDate.replace(/^(\d{1}):(\d{2}):(\d{2})\s(AM|PM|לפי|אחי)/, ' $1:$2:$3 $4');
    return formattedDate;
  };

  export const isRTLCheck = (text: string): boolean => {
    return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/.test(text);
  };

  export const evaluateBackupIntegrityWithMessages = (backup: Backup, t: (key: string) => string, fileIntegrityCompromised: boolean, recordIntegrity: boolean): { text: string; success: boolean }[] => {
    const integrityStatus = evaluateBackupIntegrity(backup, t);
  
    if (fileIntegrityCompromised) {
      integrityStatus.push({ text: t("file-integrity-error"), success: false });
    } else {
      integrityStatus.push({ text: t("file-integrity-success"), success: true });
    }
    if (!recordIntegrity) {
      integrityStatus.push({ text: t("backup-integrity-compromised"), success: false });
    } else {
      integrityStatus.push({ text: t("backup-integrity-success"), success: true });
    }
  
    return integrityStatus;
  };

  export const base64ToUint8Array = (base64: string): Uint8Array => {
    try {
      const binaryString = atob(base64);
      const uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
      return uint8Array;
    } catch (error) {
      console.warn(error);
      return new Uint8Array([1]);
    }
  };

  export async function encodeTag(generatedTag: string): Promise<Uint8Array> {
    const parts = generatedTag.split(",");
    if (parts.length !== 4) throw new Error("Invalid tag format - expected 4 comma-separated parts");
  
    // Convert parts to Uint8Arrays
    const part4 = base64ToUint8Array(parts[3]); // Last part in string -> first in array
    const part3 = base64ToUint8Array(parts[2]);
    const part2 = new TextEncoder().encode(parts[1]);
    const part1 = base64ToUint8Array(parts[0]); // First part in string -> last in array
  
    // Validate fixed-length segments (updated sizes)
    if (part4.length !== 416) throw new Error("Part 4 must decode to exactly 416 bytes");
    if (part3.length !== 672) throw new Error("Part 3 must decode to exactly 672 bytes");
    if (part2.length !== 10) throw new Error("Part 2 must be exactly 10 UTF-8 bytes");
  
    // Create combined array
    const totalLength = 416 + 672 + 10 + part1.length;
    const combined = new Uint8Array(totalLength);
  
    let offset = 0;
    combined.set(part4, offset); offset += 416;  // 4th part (string) -> 1st segment
    combined.set(part3, offset); offset += 672;  // 3rd part (string) -> 2nd segment
    combined.set(part2, offset); offset += 10;   // 2nd part (string) -> 3rd segment
    combined.set(part1, offset);                 // 1st part (string) -> 4th segment
  
    return combined;
  };

  export async function decodeTag(uintArray: Uint8Array): Promise<string> {
    // Validate minimum length (updated sizes)
    const minLength = 416 + 672 + 10;
    if (uintArray.length < minLength) {
      throw new Error(`Invalid array length - minimum ${minLength} bytes required`);
    }
  
    // Split array into segments
    let offset = 0;
    
    // 1st segment: 416 bytes (4th part in original string)
    const part4 = uintArray.slice(offset, offset + 416);
    offset += 416;
    
    // 2nd segment: 672 bytes (3rd part in original string)
    const part3 = uintArray.slice(offset, offset + 672);
    offset += 672;
    
    // 3rd segment: 10 bytes (2nd part in original string)
    const part2 = uintArray.slice(offset, offset + 10);
    offset += 10;
    
    // 4th segment: Remaining bytes (1st part in original string)
    const part1 = uintArray.slice(offset);
  
    // Convert back to strings
    return [
      btoa(String.fromCharCode(...part1)),  // First part in string
      new TextDecoder().decode(part2),      // Second part in string
      btoa(String.fromCharCode(...part3)),  // Third part in string
      btoa(String.fromCharCode(...part4))   // Fourth part in string
    ].join(",");
  };

  export const evaluateSharedBackupIntegrity = (backup: Backup, t: (key: string) => string): { text: string; success: boolean }[] => {
    const integrityStatus: { text: string; success: boolean }[] = [];

    const {
      decryptedResult,
      encryptedData,
    } = backup;

    // ===== Check Filename Integrity =====
    const filenameIntegrity = decryptedResult?.filenameIntegrity ?? null;
    const encryptedFilename = encryptedData?.encryptedFilename?.value ?? null;

    if (filenameIntegrity !== null && !filenameIntegrity) {
      integrityStatus.push({
        text: t("filename-integrity-error"),
        success: false,
      });
    }
    if (!encryptedFilename) {
      integrityStatus.push({
        text: t("missing-filename-error"),
        success: false,
      });
    }

    // ===== Check Description Integrity =====
    const descriptionIntegrity = decryptedResult?.descriptionIntegrity ?? null;
    const encryptedDescription = encryptedData?.encryptedDescription?.value ?? null;
    const encryptedMetadataTag = encryptedData?.encryptedMetadataTag?.value ?? null;

    if (descriptionIntegrity !== null && !descriptionIntegrity) {
      integrityStatus.push({
        text: t("description-integrity-error"),
        success: false,
      });
    }
    
    // Handle cases where one of `encryptedDescription` or `encryptedMetadataTag` is missing
    if (encryptedMetadataTag && !encryptedDescription) {
      integrityStatus.push({
        text: t("missing-description-error"),
        success: false,
      });
    }
    
    if (encryptedDescription && !encryptedMetadataTag) {
      integrityStatus.push({
        text: t("missing-metadata-tag-error"),
        success: false,
      });
    }

    // ===== Check Metadata Integrity =====
    const metadataIntegrity = decryptedResult?.metadataIntegrity ?? null;

    if (metadataIntegrity !== null && !metadataIntegrity) {
      integrityStatus.push({
        text: t("metadata-integrity-error"),
        success: false,
      });
    }

    // Special case for filename-only presence
    const decryptedFilename = decryptedResult?.decryptedFilename ?? null;
    const decryptedDescription = decryptedResult?.decryptedDescription ?? null;

    if (decryptedFilename && !decryptedDescription && metadataIntegrity === null) {
      if (filenameIntegrity) {
        integrityStatus.push({ text: t("metadata-integrity-success"), success: true });
      }
    } else if (
      filenameIntegrity &&
      descriptionIntegrity &&
      metadataIntegrity
    ) {
      return [{ text: t("metadata-integrity-success"), success: true }];
    }

    return integrityStatus;
  };

  export const evaluateSharedBackupIntegrityWithMessages = (backup: Backup, t: (key: string) => string, fileIntegrityCompromised: boolean, recordIntegrity: boolean): { text: string; success: boolean }[] => {
    const integrityStatus = evaluateSharedBackupIntegrity(backup, t);
  
    if (fileIntegrityCompromised) {
      integrityStatus.push({ text: t("file-integrity-error"), success: false });
    } else {
      integrityStatus.push({ text: t("file-integrity-success"), success: true });
    }
    if (!recordIntegrity) {
      integrityStatus.push({ text: t("backup-integrity-compromised"), success: false });
    } else {
      integrityStatus.push({ text: t("backup-integrity-success"), success: true });
    }
  
    return integrityStatus;
  };