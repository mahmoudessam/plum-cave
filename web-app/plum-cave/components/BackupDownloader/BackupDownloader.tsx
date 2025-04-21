import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import { getFirestore, collection, doc, getDocs, getDoc } from 'firebase/firestore';

type DownloadBackupChunksType = (
  userEmail: string,
  projectId: string,
  encryptedLength?: number | null
) => Promise<Uint8Array>;

const useBackupDownloader = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const downloadBackupChunks: DownloadBackupChunksType = async (
    userEmail,
    projectId,
    encryptedLength = null
  ) => {
    try {
      const db = getFirestore();
      const basePath = `data/${userEmail}/backups/${projectId}`;
      const chunkSize = 16 * 1024;

      // Initial loading state with custom styling
      Swal.fire({
        title: t('downloading_backup'),
        html: `
              <p style="margin-bottom: 10px;" dir="${isRTL ? 'rtl' : 'ltr'}">${t('preparing_for_download')}</p>
              <p dir="${isRTL ? 'rtl' : 'ltr'}">${t('please_wait')}</p>
        `,
        color: "var(--foreground)",
        background: "var(--card-background)",
        width: 640,
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: {
          popup: "swal-custom-popup"
        },
          didOpen: () => {
              Swal.showLoading();
          }
      });

      let chunks: Uint8Array[] = [];
      let totalChunks = 0;
      let chunkNumber = 0;

      if (typeof encryptedLength === 'number' && encryptedLength > 0) {
        totalChunks = Math.ceil(encryptedLength / chunkSize);
        while (chunkNumber < totalChunks) {
          const chunkRef = doc(db, `${basePath}/chunks`, `${chunkNumber}`);
          const chunkDoc = await getDoc(chunkRef);

          if (!chunkDoc.exists()) {
            throw new Error(
              t('missing_chunk').replace('{{chunkNumber}}', chunkNumber.toString())
            );
          }

          const chunkData = chunkDoc.data();
          if (!chunkData?.data) {
            throw new Error(t('invalid_chunk_format'));
          }

          const uint8Array = base64ToUint8Array(chunkData.data);
          chunks.push(uint8Array);
          chunkNumber++;

          const progress = (chunkNumber / totalChunks) * 100;
          Swal.update({
            html: `
              <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                ${t('downloading_chunks')}
              </p>
              <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                ${t('progress')}: ${progress.toFixed(2)}%
              </p>
              <p style="margin-bottom:10px;" dir="${isRTL ? "rtl" : "ltr"}">${t("please_wait")}</p>
            `,
            showConfirmButton: false,
          });
        }
      } else {
        Swal.update({
          html: `
            <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
              ${t('broken-metadata-detected')}
            </p>
            <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
              ${t('attempting-to-download-all-chunks-at-once-as-a-collection')}
            </p>
            <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
              ${t('please-be-patient-this-can-take-a-while')}
            </p>
          `,
          showConfirmButton: false,
        });
        Swal.showLoading();

        const chunksRef = collection(db, `${basePath}/chunks`);
        const querySnapshot = await getDocs(chunksRef);
        totalChunks = querySnapshot.size;

        if (totalChunks === 0) {
          throw new Error(t('no_chunks_found'));
        }

        for (const doc of querySnapshot.docs) {
          const chunkData = doc.data();
          if (!chunkData?.data) {
            throw new Error(t('invalid_chunk_format'));
          }

          const uint8Array = base64ToUint8Array(chunkData.data);
          chunks.push(uint8Array);

          const progress = (chunks.length / totalChunks) * 100;
          Swal.update({
            html: `
              <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                ${t('downloading_chunks')}
              </p>
              <p style="margin-bottom:10px;" dir="${isRTL ? 'rtl' : 'ltr'}">
                ${t('progress')}: ${progress.toFixed(2)}%
              </p>
            `,
          });
        }
      }

      const combined = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      );
      let offset = 0;
      chunks.forEach(chunk => {
        combined.set(chunk, offset);
        offset += chunk.length;
      });

      Swal.update({
        title: t('preparing-for-file-decryption'),
        html: `
          <p dir="${isRTL ? 'rtl' : 'ltr'}">
            ${t('please_wait')}
          </p>
        `,
        showConfirmButton: false,
      });
      Swal.showLoading();
      return combined;
    } catch (error) {
      console.error('Download failed:', error);
      Swal.close();
      throw error;
    }
  };

  return { downloadBackupChunks };
};

const base64ToUint8Array = (base64: string): Uint8Array => {
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

export default useBackupDownloader;
