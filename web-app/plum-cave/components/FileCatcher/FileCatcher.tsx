"use client";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileUpload } from "@/components/FileUpload/FileUpload";
import HalomotButton from "@/components/HalomotButton/HalomotButton";

interface FileCatcherProps {
  onFileProcessed: (file: File | null, projectId: string | null) => void;
  isOpen: boolean;
  projectId: string | null;
}

const FileCatcher = ({ onFileProcessed, isOpen, projectId }: FileCatcherProps) => {
  const { t, i18n } = useTranslation();
  const [hasMultipleFiles, setHasMultipleFiles] = useState(false);
  const isRTL = i18n.language === "he";

  const handleFileChange = (file: File | null, isSingleFile: boolean) => {
    if (!isSingleFile) {
      setHasMultipleFiles(true);
      return;
    }

    setHasMultipleFiles(false);
    onFileProcessed(file, projectId); // Return file and project ID to parent
  };

  useEffect(() => {
    if (hasMultipleFiles) {
      throw new Error("Multiple file selection is not supported");
    }
  }, [hasMultipleFiles]);

  return (
    <div
      className="file-processing-popup"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: isOpen ? "flex" : "none",
        justifyContent: "center",
        alignItems: "center",
        overflowX: "hidden",
        background: "rgba(21, 20, 25, 0.7)",
        backdropFilter: "blur(10px) saturate(90%)",
        zIndex: 1000,
      }}
    >
      <div
        className="modal-background"
        style={{
          width: "min(90vw, 1600px)",
          height: "min(90vh, 524px)",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          gap: "20px",
          overflow: "visible",
          background: "var(--card-background)",
          border: "1px solid var(--lightened-background-adjacent-color)",
        }}
      >
        <h2 className="font-bold text-xl text-white mb-2">{t("new-backup")}</h2>
        <FileUpload onChange={handleFileChange} />
        <div className="flex flex-1" />
        <HalomotButton
          text={t("cancel-button-inscription")}
          onClick={() => onFileProcessed(null, null)} // Notify parent of cancellation
          gradient={
            isRTL
              ? "linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))"
              : "linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))"
          }
          fillWidth
        />
      </div>
    </div>
  );
};

export default FileCatcher;
