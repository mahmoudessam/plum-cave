"use client";
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DreamyInput from "@/components/DreamyInput/DreamyInput";
import HalomotButton from "@/components/HalomotButton/HalomotButton";

interface GetRecipientEmailProps {
  onClose: () => void; // Callback for closing the modal
  onSubmit: (email: string) => void; // Callback for submitting the email
}

const GetRecipientEmail: React.FC<GetRecipientEmailProps> = ({ onClose, onSubmit }) => {
  const { i18n, t } = useTranslation();
  const isRTL = i18n.language === "he"; // Check if the current language is RTL
  const [windowWidth, setWindowWidth] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null); // Ref for email input

  // Detect window width for responsive design
  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 520; // Define mobile breakpoint

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle "Continue" button click
  const handleContinue = () => {
    const email = emailRef.current?.value || ""; // Extract value from input ref

    if (!email.trim()) {
      alert(t("email-cant-be-empty-error")); // Alert for empty email
      return;
    }
    if (!validateEmail(email)) {
      alert(t("invalid-email-error")); // Alert for invalid email
      return;
    }
    onSubmit(email); // Pass valid email to parent component
    onClose(); // Close modal after submission
  };

  return (
    <div className="file-processing-popup">
      <div className="file-processing-popup-main">
        {/* Title */}
        <h2
          className="font-bold text-xl"
          style={{
            fontWeight: "bold",
            color: "var(--foreground)",
            marginBottom: "20px",
            textAlign: isRTL ? "right" : "left",
            direction: isRTL ? "rtl" : "ltr",
          }}
        >
          {t("send-backup-to-user-title")}
        </h2>

        {/* Email Input */}
        <DreamyInput
          ref={emailRef}
          placeholder={t("recipient-email-placeholder")}
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
        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px", marginTop: "20px", width: "100%" }}>
          {isMobile ? (
            <>
              {/* Mobile View */}
              <HalomotButton
                text={t("continue")}
                onClick={handleContinue}
                gradient="linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
                fillWidth
              />
              <HalomotButton
                text={t("cancel")}
                onClick={onClose}
                gradient="linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))"
                fillWidth
              />
            </>
          ) : (
            <>
              {/* Desktop View */}
              {isRTL ? (
                <>
                  <HalomotButton
                    text={t("cancel")}
                    onClick={onClose}
                    gradient="linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))"
                  />
                  <HalomotButton
                    text={t("continue")}
                    onClick={handleContinue}
                    gradient="linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))"
                  />
                </>
              ) : (
                <>
                  <HalomotButton
                    text={t("continue")}
                    onClick={handleContinue}
                    gradient="linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))"
                  />
                  <HalomotButton
                    text={t("cancel")}
                    onClick={onClose}
                    gradient="linear-gradient(to right, var(--theme-orange-color), var(--theme-red-color))"
                  />
                </>
              )}
            </>
          )}
        </div>
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
          max-width: ${isMobile ? "90%" : "640px"};
          width: auto;
          padding: ${isMobile ? "16px" : "20px"};
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(36, 34, 43, 1);
          border-radius: none;
          border-width: 1px;
          border-style: solid;
          border-color: var(--lightened-background-adjacent-color);
        }
      `}</style>
    </div>
  );
};

export default GetRecipientEmail;
