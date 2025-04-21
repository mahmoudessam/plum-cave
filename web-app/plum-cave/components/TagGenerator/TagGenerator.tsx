"use client";

import { deriveBytesUsingArgon2id } from "@/app/cryptographicPrimitives/twoCiphersSilentMode";

interface TagGeneratorProps {
  masterKey: Uint8Array;
  metadataSalt: Uint8Array;
  fileSalt: Uint8Array;
  randomlyGeneratedFileKey: Uint8Array;
  userEmail: string;
  backupId: string;
  numberOfIterationsForMetadata: number;
  numberOfIterationsForFile: number;
}

const TagGenerator = async ({
  masterKey,
  metadataSalt,
  fileSalt,
  randomlyGeneratedFileKey,
  userEmail,
  backupId,
  numberOfIterationsForMetadata,
  numberOfIterationsForFile,
}: TagGeneratorProps): Promise<string> => {

  const textEncoder = new TextEncoder();

    // Generate Metadata Key
    const remainingMasterKeyPart = masterKey.slice(192); // Last 80 bytes
    const randomPartForRemainingKeys = randomlyGeneratedFileKey.slice(272); // Remaining random bytes
    const mergedRemainingKey = new Uint8Array(
        randomPartForRemainingKeys.length + remainingMasterKeyPart.length
    );
    mergedRemainingKey.set(randomPartForRemainingKeys);
    mergedRemainingKey.set(remainingMasterKeyPart, randomPartForRemainingKeys.length);

    const metadataKey = await deriveBytesUsingArgon2id(
        mergedRemainingKey,
        metadataSalt,
        numberOfIterationsForMetadata, // Iteration count for metadata key
        /* outputLength */ 672
    );

    // Generate File Key
    const fileMasterKeyPart = masterKey.slice(0, 192); // First part of the master key
    const mergedFileKey = new Uint8Array(
        randomlyGeneratedFileKey.slice(0, 302).length + fileMasterKeyPart.length
    );
    mergedFileKey.set(randomlyGeneratedFileKey.slice(0, 302));
    mergedFileKey.set(fileMasterKeyPart, randomlyGeneratedFileKey.slice(0, 302).length);

    const fileKey = await deriveBytesUsingArgon2id(
        mergedFileKey,
        fileSalt,
        numberOfIterationsForFile, // Iteration count for file key
        /* outputLength */ 416
    );

    // Encode email to Base64
    const encodedEmail = btoa(String.fromCharCode(...textEncoder.encode(userEmail)));

    // Convert keys to Base64
    const metadataBase64 = btoa(String.fromCharCode(...metadataKey));
    const fileBase64 = btoa(String.fromCharCode(...fileKey));

    // Generate the tag and return it
    return `${encodedEmail},${backupId},${metadataBase64},${fileBase64}`;

};

export default TagGenerator;
