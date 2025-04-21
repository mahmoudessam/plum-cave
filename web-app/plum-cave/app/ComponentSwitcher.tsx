"use client";
import React, { useState, useEffect, useRef } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18nConf from "@/next-i18next.config.js";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import Loader from "@/components/Loader/Loader";
import { gsap } from "gsap";
import useInputVerifier from "@/components/InputVerifier/InputVerifier";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useSignInSignUpCryptography from "@/components/SignInSignUpCryptography/SignInSignUpCryptography";
import Dashboard from "@/components/Dashboard/Dashboard";
import useStore from "@/store/store";
import TermsOfUseModal from "@/components/TermsOfUseModal/TermsOfUseModal"; // Import the TermsOfUseModal component

const ComponentSwitcher: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<"landing" | "signin" | "signup" | "dashboard">("landing");
  const [showTermsModal, setShowTermsModal] = useState(false); // State to control the Terms of Use modal
  const [signupData, setSignupData] = useState<{ email: string; password: string } | null>(null); // State to store signup data
  const containerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "he";
  const signInSignUpCryptography = useSignInSignUpCryptography();
  const { isLoggedIn, iterations, masterKey } = useStore();

  // Simulate content loading
  useEffect(() => {
    const loadContent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setContentLoaded(true);
    };
    loadContent();
  }, []);

  
  // Handle animations once content is loaded
  useEffect(() => {
    if (contentLoaded) {
      const tl = gsap.timeline();
      tl.to(loaderRef.current, { duration: 1 });
      tl.to(loaderRef.current, { duration: 0.3, opacity: 0, ease: "power2.inOut", onComplete: () => {
        setLoading(false);
      }});
      tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.inOut" });
    }
  }, [contentLoaded]);

  // Monitor `isLoggedIn` and switch to dashboard immediately
  useEffect(() => {
    if (isLoggedIn && iterations > 0 && masterKey.length === 272) {
      setCurrentView("dashboard");
    }
  }, [isLoggedIn, iterations, masterKey]);

  // Handle view transitions
  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.inOut" });
    }
  }, [currentView, loading]);

  const verifyInputs = useInputVerifier();

  const handleSubmit = (data: { mode: "signin" | "signup"; email: string; password: string; confirmPassword?: string; }) => {
    const validationResult = verifyInputs(data.mode, data.email, data.password, data.confirmPassword);
    if (validationResult.success) {
      if (data.mode === "signup") {
        setSignupData({ email: data.email, password: data.password }); // Store signup data
        setShowTermsModal(true); // Show the Terms of Use modal
      } else {
        handleAuthentication(data.mode, data.email, data.password);
      }
    } else {
      toast.error(validationResult.message);
    }
  };

  const handleAuthentication = async (mode: "signin" | "signup", email: string, password: string) => {
    await signInSignUpCryptography(mode, email, password);
    // No need to manually switch to dashboard here; the effect handles it
  };

  const handleViewChange = (newView: "landing" | "signin" | "signup") => {
    if (containerRef.current) {
      gsap.to(containerRef.current, { opacity: 0, duration: 0.3, ease: "power2.inOut", onComplete: () => {
        setCurrentView(newView);
      }});
    } else {
      setCurrentView(newView);
    }
  };

  const handleSignIn = () => handleViewChange("signin");
  const handleSignUp = () => handleViewChange("signup");
  const handleHome = () => handleViewChange("landing");
  const handleLogout = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, { opacity: 0, duration: 0.3, ease: "power2.inOut", onComplete: () => {
        setCurrentView("landing");
      }});
    } else {
      setCurrentView("landing");
    }
  };

  const handleTermsAccepted = () => {
    if (signupData) {
      setShowTermsModal(false); // Hide the Terms of Use modal
      // Continue with the authentication process
      handleAuthentication("signup", signupData.email, signupData.password);
    }
  };

  return (
    <I18nextProvider i18n={i18nConf}>
      <div style={{ background: "var(--background)", minHeight: "100vh" }}>
        {loading ? (
          <div ref={loaderRef}>
            <Loader />
          </div>
        ) : (
          <div ref={containerRef}>
            {currentView === "landing" && (
              <LandingPage onSignIn={handleSignIn} onSignUp={handleSignUp} />
            )}
            {(currentView === "signin" || currentView === "signup") && (
              <LoginPage initialMode={currentView} onSubmit={handleSubmit} onHome={handleHome} />
            )}
            {currentView === "dashboard" && <Dashboard onLogout={handleLogout} />}
          </div>
        )}
        <ToastContainer
          position={isRTL ? "bottom-left" : "bottom-right"}
          autoClose={5000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick
          rtl={isRTL}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          toastStyle={{ background: "var(--card-background)", color: "var(--foreground)", border: "1px solid var(--lightened-background-adjacent-color)", borderRadius: "0" }}
        />
        {showTermsModal && (
          <TermsOfUseModal isOpen={showTermsModal} onClose={handleTermsAccepted} />
        )}
      </div>
    </I18nextProvider>
  );
};

export default ComponentSwitcher;
