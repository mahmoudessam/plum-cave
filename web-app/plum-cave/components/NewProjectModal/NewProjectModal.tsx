"use client";
import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import HalomotButton from "@/components/HalomotButton/HalomotButton";
import DreamyInput from "@/components/DreamyInput/DreamyInput";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: (projectName: string | null, projectDescription: string | null) => void;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "he";

  const [windowWidth, setWindowWidth] = useState(0);

  // Refs for DreamyInput fields
  const projectNameRef = useRef<HTMLInputElement>(null);
  const projectDescriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 520;

  const handleContinue = () => {
    // Extract values from refs
    const projectName = projectNameRef.current?.value.trim() || null;
    const projectDescription = projectDescriptionRef.current?.value.trim() || null;

    if (!projectName) {
      alert(t("empty-project-name-error")); // Default browser alert
      return;
    }

    onClose(projectName, projectDescription); // Pass values back to parent
  };

  const handleCancel = () => {
    onClose(null, null); // Close modal without values
  };

  return (
    <>
      {isOpen && (
        <div className="file-processing-popup">
          <div className="modal-background">
            <div
              style={{
                width: isMobile ? "100vw" : "min(90vw, 640px)",
                height: isMobile ? "100vh" : "min(90vh, 560px)",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
                gap: "20px",
                overflow: isMobile ? "hidden" : "visible",
              }}
            >
              <h2 className="font-bold text-xl text-white mb-2">{t("new-project-inscription")}</h2>
              <div style={{ width: "100%" }}>
                <div
                  className={`flex ${isRTL ? "justify-end" : ""}`}
                  style={{ width: "100%" }}
                >
                  <label
                    className="text-white mb-"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {t("project-name")}:
                  </label>
                </div>
                <div style={{ height: "6px" }}></div>
                <DreamyInput
                  ref={projectNameRef}
                  placeholder={t("project-name-placeholder")}
                  presetText=""
                  outlineColor={
                    i18n.language === "he"
                      ? "linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
                      : "linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
                  }
                  outlineColorHover={
                    i18n.language === "he"
                      ? "linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
                      : "linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
                  }
                  backgroundColor="var(--background)"
                />
              </div>
              <div style={{ width: "100%" }}>
                <div
                  className={`flex ${isRTL ? "justify-end" : ""}`}
                  style={{ width: "100%" }}
                >
                  <label
                    className="text-white mb-"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {t("description")}:
                  </label>
                </div>
                <div style={{ height: "6px" }}></div>
                <DreamyInput
                  ref={projectDescriptionRef}
                  placeholder={t("project-description-placeholder")}
                  presetText=""
                  multiLine={true}
                  multiLineHeight={isMobile ? 3.2 : 4.18}
                  outlineColor={
                    i18n.language === "he"
                      ? "linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
                      : "linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
                  }
                  outlineColorHover={
                    i18n.language === "he"
                      ? "linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
                      : "linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
                  }
                  backgroundColor="var(--background)"
                />
              </div>
              <div className="flex flex-1" />
              <div className={isMobile ? 'flex flex-col gap-6 w-full' : 'flex gap-6 w-full'}>
                {isMobile ? (
                  <>
                    <HalomotButton
                      text={t("continue-button-inscription")}
                      onClick={handleContinue}
                      gradient={
                        i18n.language === 'he'
                          ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))'
                          : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
                      }
                      fillWidth
                    />
                    <HalomotButton
                      text={t("cancel-button-inscription")}
                      onClick={handleCancel}
                      gradient={
                        i18n.language === 'he'
                          ? 'linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))'
                          : 'linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))'
                      }
                      fillWidth
                    />
                  </>
                ) : (
                  <>
                    <HalomotButton
                      text={t("continue-button-inscription")}
                      onClick={handleContinue}
                      gradient={
                        i18n.language === 'he'
                          ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))'
                          : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
                      }
                    />
                    <HalomotButton
                      text={t("cancel-button-inscription")}
                      onClick={handleCancel}
                      gradient={
                        i18n.language === 'he'
                          ? 'linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))'
                          : 'linear-gradient(to right, var(--theme-red-color), var(--theme-orange-color))'
                      }
                    />
                  </>
                )}
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
      `}</style>
    </>
  );
};

export default NewProjectModal;
