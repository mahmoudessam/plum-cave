  export interface Project {
    id: string;
    name: string;
    description?: string;
    integrity: boolean;
    createdAt?: Date;
    backups: Backup[];
  }
  
  export interface Backup {
    id: string;
    privateData: {
      randomlyGeneratedFileKey: {
        value: Uint8Array | null;
        integrity: boolean | null; // Null if absent
        status: "valid" | "corrupted" | "absent"; // New field for status
      };
      fileSalt: {
        value: Uint8Array | null;
        integrity: boolean | null; // Null if absent
        status: "valid" | "corrupted" | "absent"; // New field for status
      };
      metadataSalt: {
        value: Uint8Array | null;
        integrity: boolean | null; // Null if absent
        status: "valid" | "corrupted" | "absent"; // New field for status
      };
      encryptedTag: {
        value: Uint8Array | null;
        integrity: boolean | null; // Null if absent
        status: "valid" | "corrupted" | "absent"; // New field for status
      };
    };
    encryptedData?: {
      encryptedFilename?: {
        value: Uint8Array | null;
        status: "valid" | "corrupted" | "absent";
      };
      encryptedDescription?: {
        value: Uint8Array | null;
        status: "valid" | "corrupted" | "absent";
      };
      encryptedMetadataTag?: {
        value: Uint8Array | null;
        status: "valid" | "corrupted" | "absent";
      };
    };
    encryptedRecordIntegrityTag?: {
      value: Uint8Array | null;
      integrity: boolean | null; // Null if absent
      status: "valid" | "corrupted" | "absent"; // New field for status
    };
    decryptedResult?: {
      decryptedFilename?: string | null;
      filenameIntegrity?: boolean | null; // Null if absent
      decryptedDescription?: string | null;
      descriptionIntegrity?: boolean | null; // Null if absent
      metadataIntegrity?: boolean | null; // Null if absent
    };
    createdAt?: Date | null;
    downloads?: number | null;
    size?: number;
    encryptedSize?: number;
    isPublic?: boolean;
  }
  
  export type SharedBackup = Backup & {
    localIdentifier: string;
    owner?: string;
    sender?: string;
    recipient?: string;
    tag?: string;
  };