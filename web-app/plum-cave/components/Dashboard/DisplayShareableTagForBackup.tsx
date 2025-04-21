"use client";
import React from "react";
import { useTranslation } from "react-i18next";
import HalomotButton from "@/components/HalomotButton/HalomotButton";
import DreamyInput from "@/components/DreamyInput/DreamyInput";

interface DisplayShareableTagForBackupProps {
  onClose: () => void; // Callback for closing the modal
  shareableTag: string; // The generated shareable tag to display
}

const DisplayShareableTagForBackup: React.FC<DisplayShareableTagForBackupProps> = ({
  onClose,
  shareableTag,
}) => {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === "he"; // Check if the current language is RTL

  return (
    <div className="file-processing-popup">
      <div className="file-processing-popup-main">
        {/* Main Title */}
        <h2
          className="font-bold text-xl"
          style={{
            fontWeight: "bold",
            color: "#FFFFFF",
            marginBottom: "20px",
            textAlign: isRTL ? "right" : "left", // Align based on language direction
            direction: isRTL ? "rtl" : "ltr", // Set text direction
          }}
        >
          {t("share-backup-title")}
        </h2>

        {/* Subtext */}
        <p
          style={{
            fontSize: "1rem",
            color: "#FFFFFF",
            marginBottom: "20px",
            textAlign: isRTL ? "right" : "left", // Align based on language direction
            direction: isRTL ? "rtl" : "ltr", // Set text direction
          }}
        >
          {t(
            "provide-this-tag-to-the-recipient-that-will-enable-them-to-download-and-decrypt-the-backup"
          )}
        </p>

        {/* Tag Display using DreamyInput */}
        <DreamyInput
          presetText={shareableTag}
          readOnly={true}
          multiLine={true}
          multiLineHeight={3.2} // Multi-line height as requested
          outlineColor={
            isRTL
              ? "linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
              : "linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
          }
          outlineColorHover={
            isRTL
              ? "linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
              : "linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
          }
          backgroundColor="var(--background)"
        />

        {/* Gap */}
        <div style={{ height: "20px" }} />

        {/* Close Button */}
        <HalomotButton
          text={t("close")}
          onClick={onClose}
          gradient={
            isRTL
              ? "linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))"
              : "linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))"
          }
          fillWidth
        />
      </div>

      {/* Styles */}
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
        .file-processing-popup-main {
          max-width: 90%;
          width: auto;
          padding: 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(36, 34, 43, 1);
          border-radius: none; /* No rounding allowed */
          border-width: 1px; /* Outline width */
          border-style: solid;
          border-color: var(--lightened-background-adjacent-color);
        }
      `}</style>
    </div>
  );
};

export default DisplayShareableTagForBackup;
