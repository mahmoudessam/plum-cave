"use client";

import { doc, getDoc } from "firebase/firestore";
import { db } from '@/app/lib/firebase';
import { base64ToUint8Array } from "@/components/utils";
import type { Backup } from '../types';
import { decryptStringWithTwoCiphersCBC, CheckBackupIntegrity } from '@/app/cryptographicPrimitives/twoCiphersSilentMode';


export const fetchAndDecryptBackupById = async (
  userEmail: string,
  backupId: string,
  metadataKey: Uint8Array
): Promise<Backup> => {
  const backupRef = doc(db, `data/${userEmail}/backups/${backupId}`);
  const docSnapshot = await getDoc(backupRef);
  
  if (!docSnapshot.exists()) {
    throw new Error("Backup not found");
  }

  const data = docSnapshot.data();
  
  // Process encrypted fields
  const encryptedData = {
    encryptedFilename: processEncryptedField(data.encryptedFilename),
    encryptedDescription: processEncryptedField(data.encryptedDescription),
    encryptedMetadataTag: processEncryptedField(data.encryptedMetadataTag)
  };

  // Create private data structure
  const privateData = {
    randomlyGeneratedFileKey: {
      value: null,
      integrity: true,
      status: "valid" as const
    },
    fileSalt: {
      value: null,
      integrity: true,
      status: "valid" as const
    },
    metadataSalt: {
      value: null,
      integrity: true,
      status: "valid" as const
    },
    encryptedTag: {
      value: null,
      integrity: true,
      status: "valid" as const
    }
  };

  // Decrypt metadata
  const decryptedResult = await decryptBackupMetadata(
    encryptedData.encryptedFilename.value,
    encryptedData.encryptedDescription.value,
    encryptedData.encryptedMetadataTag.value,
    metadataKey
  );

  // Process record integrity tag
  const encryptedRecordIntegrityTag = processEncryptedField(data.encryptedRecordIntegrityTag);

  return {
    id: backupId,
    privateData,
    encryptedData,
    encryptedRecordIntegrityTag: {
      value: encryptedRecordIntegrityTag.value,
      integrity: encryptedRecordIntegrityTag.status === "valid" ? true : null,
      status: encryptedRecordIntegrityTag.status
    },
    decryptedResult: {
      decryptedFilename: decryptedResult.decryptedFilename ? 
        new TextDecoder().decode(decryptedResult.decryptedFilename) : null,
      filenameIntegrity: decryptedResult.filenameIntegrity,
      decryptedDescription: decryptedResult.decryptedDescription ? 
        new TextDecoder().decode(decryptedResult.decryptedDescription) : null,
      descriptionIntegrity: decryptedResult.descriptionIntegrity,
      metadataIntegrity: decryptedResult.metadataIntegrity
    },
    createdAt: data.createdAt?.toDate() || null,
    downloads: data.downloads ?? null,
    size: data.size ?? -1,
    encryptedSize: data.encryptedSize ?? -1,
    isPublic: data.isPublic ?? false
  };
};

// Helper function for encrypted field processing
const processEncryptedField = (field: string | undefined) => {
  if (!field) return { value: null, status: "absent" as const };
  
  const decoded = base64ToUint8Array(field);
  return {
    value: decoded.length % 16 === 0 ? decoded : null,
    status: decoded.length % 16 === 0 ? "valid" as const : "corrupted" as const
  };
};

// Decryption implementation
const decryptBackupMetadata = async (
  encryptedFilename: Uint8Array | null,
  encryptedDescription: Uint8Array | null,
  encryptedMetadataTag: Uint8Array | null,
  metadataKey: Uint8Array
) => {
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