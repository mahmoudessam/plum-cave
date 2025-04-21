"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import HalomotButton from "@/components/HalomotButton/HalomotButton";

interface ChooseHowToShareBackupModalProps {
  onClose: () => void;
  onAction: (
    actionType: "get-shareable-tag" | "send-to-user",
    projectId: string,
    backupId: string
  ) => void;
  projectId: string;
  backupId: string;
}

const ChooseHowToShareBackupModal: React.FC<ChooseHowToShareBackupModalProps> = ({
  onClose,
  onAction,
  projectId,
  backupId,
}) => {
  const { t, i18n } = useTranslation();
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  const isMobile = windowWidth < 520;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleActionClick = (actionType: "get-shareable-tag" | "send-to-user") => {
    onAction(actionType, projectId, backupId); // Pass action type, projectId, and backupId to parent
    onClose(); // Close the modal
  };

  return (
    <div className="file-processing-popup">
      <div className="file-processing-popup-main">
        <h2 className="font-bold text-xl"
          style={{
            fontWeight: "bold",
            color: "#FFFFFF",
            marginBottom: "20px",
          }}
        >
          {t("share-backup-title")}
        </h2>
        <HalomotButton
          text={t("get-shareable-tag")}
          onClick={() => handleActionClick("get-shareable-tag")}
          gradient={
            i18n.language === "he"
              ? "linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
              : "linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
          }
          fillWidth
        />
        <div style={{ height: "20px" }} /> {/* Gap between buttons */}
        <HalomotButton
          text={t("send-to-another-user")}
          onClick={() => handleActionClick("send-to-user")}
          gradient={
            i18n.language === "he"
              ? "linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
              : "linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
          }
          fillWidth
        />
        <div style={{ height: "20px" }} /> {/* Gap between buttons */}
        <HalomotButton
          text={t("cancel")}
          onClick={onClose}
          gradient={
            i18n.language === "he"
              ? "linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))"
              : "linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))"
          }
          fillWidth
        />
      </div>
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
          max-width: 600px;
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
      `}</style>
    </div>
  );
};

export default ChooseHowToShareBackupModal;
