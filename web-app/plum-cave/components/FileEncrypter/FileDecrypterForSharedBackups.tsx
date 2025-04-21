"use client"
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from "react-i18next";
import { hexStringToArray, pkcs7PaddingConsumed, computeTagForDataUsingHMACSHA512, compareUint8Arrays } from "@/app/cryptographicPrimitives/twoCiphersSilentMode";
import { createSHA3, createHMAC, whirlpool, sha512 } from 'hash-wasm';
import { decryptSerpent256ECB } from '@/app/cryptographicPrimitives/serpent';
import { ChaCha20 } from 'mipher';
import Swal from 'sweetalert2';

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
  
interface FileDecrypterProps {
  derivedFileKey: Uint8Array;
  encryptedFileContent: Uint8Array;
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

const FileDecrypter: React.FC<FileDecrypterProps> = ({
  derivedFileKey,
  encryptedFileContent,
  encryptedRecordIntegrityTag,
  encodedDecryptedFilename,
  encodedDecryptedDescription,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "he";
  const [showProcessingPopup, setShowProcessingPopup] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingStepDescription, setProcessingStepDescription] = useState("");
  const [currentFileName, setCurrentFileName] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const progressContainerRef = useRef<HTMLDivElement>(null);
  
  const toggleProgressAnimation = (isAnimating: boolean) => {
    const container = progressContainerRef.current;
    if (!container) return;
  
    if (isAnimating) {
      container.innerHTML = `
        <style>
          @keyframes moveBar {
            0%, 100% { left: 0; }
            50% { left: 80%; }
          }
          @keyframes shiftColor {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
          }
          .animated-bar {
            width: 20%;
            height: 100%;
            background: linear-gradient(90deg, #9F4EFF, #00A6FB, #9F4EFF, #00A6FB);
            background-size: 300% 100%;
            box-shadow: 0 3px 3px -5px rgba(0, 166, 251, 0.7), 0 2px 5px rgba(159, 79, 255, 0.7);
            position: absolute;
            top: 0;
            left: 0;
            border-radius: 15px;
            animation: moveBar 2s linear infinite, shiftColor 4s linear infinite;
          }
          .animated-bar-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 14px;
          }
        </style>
        <div class="animated-bar">
          <div class="animated-bar-text"></div>
        </div>`;
    } else {
      container.innerHTML = `
        <style>
          .file-processing-popup-progress-done {
            background: linear-gradient(to left, ${isRTL ? '#00A6FB, #9F4EFF' : '#9F4EFF, #00A6FB'});
            box-shadow: 0 3px 3px -5px rgba(0, 166, 251, 0.7), 0 2px 5px rgba(159, 79, 255, 0.7);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            width: ${processingProgress}%;
            opacity: 1;
            border-radius: 15px;
            transition: width 0.3s ease-out;
          }
        </style>
        <div class="file-processing-popup-progress-done" 
             style="transform: ${isRTL ? 'scaleX(-1)' : 'none'}">
          ${processingProgress.toFixed(2)}%
        </div>`;
    }
  };
  
  useEffect(() => {
    if (!showProcessingPopup) return;
    const container = progressContainerRef.current;
    if (!container) return;
  
    const progressDoneElement = container.querySelector('.file-processing-popup-progress-done') as HTMLElement;
    if (progressDoneElement) {
      // Update both CSS width and text content
      progressDoneElement.style.width = `${processingProgress}%`;
      progressDoneElement.textContent = `${processingProgress.toFixed(2)}%`;
    }
  }, [processingProgress, showProcessingPopup]);

  const computeTagForFileUsingHMACSHA512 = useCallback(async (key: Uint8Array, data: Uint8Array) => {
    toggleProgressAnimation(false);
    setProcessingStep(t('computing-tag-for-file-using-HMAC-SHA3-512'));
    setProcessingStepDescription(t('please_wait'));
    await new Promise(resolve => setTimeout(resolve, 10));
    const chunkSize = 256 * 1024; // 256 KB chunks
    let offset = 0;
    const hmac = await createHMAC(createSHA3(512), key);
    hmac.init();

    async function updateProgressWithDelay(progress: number) {
      setProcessingProgress(progress);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    while (offset < data.length) {
      const chunk = data.slice(offset, Math.min(offset + chunkSize, data.length));
      hmac.update(chunk);
      offset += chunk.length;

      const progress = (offset / data.length) * 100;
      await updateProgressWithDelay(progress);
    }
    await new Promise(resolve => setTimeout(resolve, 20));
    setProcessingProgress(100);
    setProcessingStep(t('finalizing-tag-computation'));
    await new Promise(resolve => setTimeout(resolve, 20));
    toggleProgressAnimation(true);
    await new Promise(resolve => setTimeout(resolve, 20));
    const signature = hmac.digest('binary');
    return new Uint8Array(signature);
  }, []);

  useEffect(() => {
    const singleton = SingletonEffect.getInstance();
    
    const startFileDecryption = async () => {
      try {
        // Handle filename decoding first
        if (encodedDecryptedFilename) {
          const decoder = new TextDecoder();
          const decodedFileName = decoder.decode(encodedDecryptedFilename);
          setCurrentFileName(decodedFileName); // This will trigger a re-render
        } else {
          setCurrentFileName(t('no-filename'));
        }

        await new Promise((resolve) => setTimeout(resolve, 24));
        
        if (encryptedFileContent) {

          const fileKey = derivedFileKey;
          
          await decryptFileWithTwoCiphersCBC(encryptedFileContent, fileKey);
        }
      } catch (error) {
        console.error('Error during backup decryption:', error);
      }
    };
  
    singleton.runEffect(() => {
      startFileDecryption();
    });
  }, [encodedDecryptedFilename, t, encryptedFileContent]);


const CheckRecordIntegrity = async (
    bytes: Uint8Array, 
    derivedKey: Uint8Array, 
    plaintextToVerify: Uint8Array
  ): Promise<boolean> => {
    const chunkSize = 16;
    let chacha20key = new Uint8Array(derivedKey.slice(0, 64));
    const blockCipherKey = derivedKey.slice(64, 96);
    const hmacKey = derivedKey.slice(96);
  
    const extractedIV = bytes.slice(0, 16);
    const decryptedIV = await decryptSerpent256ECB(extractedIV, blockCipherKey);
    let previousCiphertext = decryptedIV;
  
    const decryptedData: number[] = [];
    const dataLength = bytes.length;
    for (let i = 16; i < dataLength; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      const decryptedChunk = await decryptSerpent256ECB(chunk, blockCipherKey);
      const xorChunk = decryptedChunk.map((byte, index) => byte ^ previousCiphertext[index]);
      for (let j = 0; j < xorChunk.length; j++) {
        decryptedData.push(xorChunk[j]);
      }
      previousCiphertext = chunk;
    }
  
    const decryptedDataUint8Array = new Uint8Array(decryptedData);
  
    const chunkSizeForStreamCipher = 256 * 1024; // 256 KB chunks
    let streamCipherOffset = 0;
    const decryptedChunks = new Uint8Array(decryptedDataUint8Array);
    let decryptedOffset = 0;
    
    while (streamCipherOffset < decryptedDataUint8Array.length) {
      const input = Array.from(chacha20key).map(byte => byte.toString(16).padStart(2, '0')).join('');
      const sha512_output = await sha512(input);
      const sha512Array = hexStringToArray(sha512_output);
      const byteArray = new Uint8Array(sha512Array);
      const generatedHash = await whirlpool(byteArray);
      chacha20key = new Uint8Array(hexStringToArray(generatedHash));
    
      const chunk = decryptedDataUint8Array.slice(streamCipherOffset, Math.min(streamCipherOffset + chunkSizeForStreamCipher, decryptedDataUint8Array.length));
      const nonce = chacha20key.slice(32, 40);
      const chacha20 = new ChaCha20();
      const decryptedChunk = chacha20.decrypt(chacha20key.slice(0, 32), chunk, nonce);
      decryptedChunks.set(decryptedChunk, decryptedOffset);
      decryptedOffset += decryptedChunk.length;
    
      streamCipherOffset += chunk.length;
    }
  
    const computedTag = await computeTagForDataUsingHMACSHA512(hmacKey, plaintextToVerify);

    return compareUint8Arrays(decryptedChunks, computedTag);
  };

const decryptFileWithTwoCiphersCBC = async (
  bytes: Uint8Array,
  derivedKey: Uint8Array,
): Promise<void> => {

  const updateProgressWithDelay = async (progress: number) => {
    setProcessingProgress(progress);
    await new Promise(resolve => setTimeout(resolve, 20));
  };
  const chunkSize = 16;
  let chacha20key = new Uint8Array(derivedKey.slice(0, 64));
  const blockCipherKey = derivedKey.slice(64, 96);
  const hmacKey = derivedKey.slice(96, 224);

  const extractedIV = bytes.slice(0, 16);
  const decryptedIV = await decryptSerpent256ECB(extractedIV, blockCipherKey);
  await new Promise(resolve => setTimeout(resolve, 50));
  updateProgressWithDelay(0);
  setShowProcessingPopup(true);
  await new Promise((resolve) => setTimeout(resolve, 24));
  toggleProgressAnimation(false);
  await new Promise((resolve) => setTimeout(resolve, 24));
  Swal.close();
  setProcessingStep(t('decryption-step1'));
  setProcessingStepDescription(t('please_wait'));

  let previousCiphertext = decryptedIV;

  const decryptedData: number[] = [];
  const dataLengthNoLC = bytes.length - chunkSize;
  for (let i = 16; i < dataLengthNoLC; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    const decryptedChunk = await decryptSerpent256ECB(chunk, blockCipherKey);
    const xorChunk = decryptedChunk.map((byte, index) => byte ^ previousCiphertext[index]);
    xorChunk.forEach(byte => decryptedData.push(byte));
    previousCiphertext = chunk;
    if ((i - 16) % 16000 === 0) {
      await updateProgressWithDelay(((i - 16) / (dataLengthNoLC - 16)) * 100);
    }
  }

  // Handle padding in the last block
  const encryptedLastBlock = bytes.slice(bytes.length - chunkSize);
  const decryptedLastBlock = await decryptSerpent256ECB(encryptedLastBlock, blockCipherKey);
  const decryptedLastBlockXORed = decryptedLastBlock.map((byte, index) => byte ^ previousCiphertext[index]);
  const paddingLength = pkcs7PaddingConsumed(decryptedLastBlockXORed);
  await updateProgressWithDelay(100);

  if (paddingLength === 0) {
  } else if (paddingLength === 16) {
    // Do nothing
  } else {
    const unpaddedLastBlock = decryptedLastBlockXORed.slice(0, 16 - paddingLength);
    unpaddedLastBlock.forEach(byte => decryptedData.push(byte));
  }

  const decryptedDataUint8Array = new Uint8Array(decryptedData);

  setProcessingStep(t('decryption-step2'));
  updateProgressWithDelay(0);
  const chunkSizeForStreamCipher = 256 * 1024; // 256 KB chunks
  let streamCipherOffset = 0;
  const decryptedTag = new Uint8Array(64);
  const decryptedChunks = new Uint8Array(decryptedDataUint8Array.length - 64);
  let decryptedOffset = 0;
  
  let isFirstChunk = true;
  
  while (streamCipherOffset < decryptedDataUint8Array.length) {
    const input = Array.from(chacha20key).map(byte => byte.toString(16).padStart(2, '0')).join('');
    const sha512_output = await sha512(input);
    const sha512Array = hexStringToArray(sha512_output);
    const byteArray = new Uint8Array(sha512Array);
    const generatedHash = await whirlpool(byteArray);
    chacha20key = new Uint8Array(hexStringToArray(generatedHash));
  
    const chunk = decryptedDataUint8Array.slice(streamCipherOffset, Math.min(streamCipherOffset + chunkSizeForStreamCipher, decryptedDataUint8Array.length));
    const nonce = chacha20key.slice(32, 40);
    const chacha20 = new ChaCha20();
    const decryptedChunk = chacha20.decrypt(chacha20key.slice(0, 32), chunk, nonce);
  
    if (isFirstChunk) {
      decryptedTag.set(decryptedChunk.slice(0, 64));
      decryptedChunks.set(decryptedChunk.slice(64), 0);
      decryptedOffset = decryptedChunk.length - 64;
      isFirstChunk = false;
    } else {
      decryptedChunks.set(decryptedChunk, decryptedOffset);
      decryptedOffset += decryptedChunk.length;
    }
  
    streamCipherOffset += chunk.length;
    const progress = (streamCipherOffset / decryptedDataUint8Array.length) * 100;
    await updateProgressWithDelay(progress);
  }
  const decryptedWithStreamCipher = decryptedChunks.slice(0, decryptedOffset);
  //setProcessingStep('Verifying file integrity');
  const newTag = await computeTagForFileUsingHMACSHA512(hmacKey, decryptedWithStreamCipher);
  let integrityFailed = false;
  for (let i = 0; i < 64; i++) {
    if (decryptedTag[i] !== newTag[i]) {
      integrityFailed = true;
      break;
    }
  }

  // Record status
  const recordVerificationKey = derivedKey.slice(224);

  let recordIntegrity = false;
  if (!encryptedRecordIntegrityTag){
    SingletonEffect.resetInstance();
    onClose({
        decryptedFileContent: decryptedWithStreamCipher,
        fileIntegrityCompromised: integrityFailed,
        recordIntegrity: recordIntegrity,
        isThereAnError: false,
        errorMessage: "",
      });
    return;
  }
  if (encodedDecryptedFilename) {
  
    if (encodedDecryptedDescription && decryptedTag) {
      const combinedData = new Uint8Array(encodedDecryptedFilename.length + encodedDecryptedDescription.length + decryptedTag.length);
      combinedData.set(encodedDecryptedFilename, 0);
      combinedData.set(encodedDecryptedDescription, encodedDecryptedFilename.length);
      combinedData.set(decryptedTag, encodedDecryptedFilename.length + encodedDecryptedDescription.length);
      
      recordIntegrity = await CheckRecordIntegrity(encryptedRecordIntegrityTag, recordVerificationKey, combinedData);
    } else if (!encodedDecryptedDescription && decryptedTag) {
      // Create buffer with original structure: [filename][description][tag]
      // Even when description is missing, maintain position for tag
      const combinedData = new Uint8Array(encodedDecryptedFilename.length + 0 + decryptedTag.length);
      combinedData.set(encodedDecryptedFilename, 0);
      // Leave space for description (empty bytes)
      combinedData.set(decryptedTag, encodedDecryptedFilename.length + 0); // Tag at same position as encryption
      
      recordIntegrity = await CheckRecordIntegrity(encryptedRecordIntegrityTag, recordVerificationKey, combinedData);
    } else if (encodedDecryptedDescription && !decryptedTag) {
      recordIntegrity = false; // Integrity is compromised if record integrity tag is missing
    } else {
      recordIntegrity = false; // Integrity is compromised if both description and record integrity tag are missing
    }
  } else {
    recordIntegrity = false; // Integrity is compromised if filename is missing
  }    
  
  SingletonEffect.resetInstance();
  onClose({
    decryptedFileContent: decryptedWithStreamCipher,
    fileIntegrityCompromised: integrityFailed,
    recordIntegrity: recordIntegrity,
    isThereAnError: false,
    errorMessage: "",
  });

};

  return (
    <>
      {showProcessingPopup && (
        <div className="file-processing-popup">
          <div className="file-processing-popup-main">
            <div className="file-processing-popup-content">
              <p className="file-processing-popup-message-text">
                <span className="filename-span" dir="auto">
                  {currentFileName}
                </span>
              </p>
              <p className="file-processing-popup-message-text" dir={isRTL ? "rtl" : "ltr"}>
                {processingStep}
              </p>
              <p className="file-processing-popup-message-text" dir={isRTL ? "rtl" : "ltr"}>
                {processingStepDescription}
              </p>
              <div
                ref={progressContainerRef}
                className="file-processing-popup-progress"
                style={{ transform: i18n.language === "he" ? "scaleX(-1)" : "none" }}
              >
                {/* Progress bar or animation will be inserted here */}
              </div>
            </div>
          </div>
        </div>
      )}
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
        .file-processing-popup-main {
          max-width: 640px;
          width: 90%;
          padding: 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(36, 34, 43, 1);
          border: 1px solid var(--lightened-background-adjacent-color);
          backdrop-filter: blur(10px) saturate(90%);
        }
        .file-processing-popup-content {
          text-align: center;
          overflow-wrap: break-word;
          word-wrap: break-word;
          width: 90%;
        }
        .file-processing-popup-message-text {
          margin: 10px 0;
          font-size: 18px;
          color: #ffffff;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .filename-span {
          font-weight: bold;
          color: #f7f7ff;
          display: inline-block;
          overflow-wrap: break-word;
          width: 94%;
          max-width: 560px;
          word-wrap: break-word;
        }
        .file-processing-popup-progress {
          background-color: #eeeeee;
          border-radius: 20px;
          position: relative;
          margin: 15px 0;
          height: 30px;
          width: 100%;
          max-width: 560px;
          overflow: hidden;
        }
      `}</style>
    </>
  );
};

export default FileDecrypter;