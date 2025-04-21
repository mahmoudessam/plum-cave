"use client";
import React, { useState } from "react";
import Navbar from "@/components/LandingPageNavbar/LandingPageNavbar";
import styled from "styled-components";
import { I18nextProvider } from 'react-i18next';
import i18nConf from '@/next-i18next.config.js';
import { useTranslation } from 'react-i18next';
import HeroSection from '@/components/HeroSection/HeroSection'
import RTLHeroSection from '@/components/RTLHeroSection/RTLHeroSection'
import StructuredBlock from '@/components/StructuredBlock/StructuredBlock'
import FeaturesSection from '@/components/FeaturesSection/FeaturesSwitcher'
import PricingCard from '@/components/PricingCard/PricingCard'
import LandingPageDownloader from '@/components/LandingPageDownloader/LandingPageDownloader'
import FancyFooter from 'components/FancyFooter/FancyFooter'
import CreditModal from 'components/CreditModal/CreditModal'

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, onSignUp }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  const openModal = () => setIsCreditModalOpen(true);
  const closeModal = () => setIsCreditModalOpen(false);

  const sections = [
    { id: "home", label: t("section-home") },
    { id: "features", label: t("section-features") },
    { id: "pricing", label: t("section-pricing") },
    { id: "downloader", label: t("section-downloader") },
  ];

  const getLocalizedTextForHeroSection = () => {
    switch (i18n.language) {
      case "en": return ["Backups", "Made", "Simple"];
      case "he": return ["גיבויים", "בפשטות"];
      case "es_ar": return ["Copias", "de seguridad", "simplificadas"];
      default: return ["Backups", "Made", "Simple"];
    }
  };

  const heroTopWords = getLocalizedTextForHeroSection();

  return (
    <I18nextProvider i18n={i18nConf}>
      <div className="bg-[var(--background)]">
        <div style={{ height: "69px" }}></div>
        <Navbar
          sections={sections}
          desktopPadding="24px"
          mobilePadding="10px"
          desktopFont="23px"
          mobileFont="20px"
          desktopSubFont="14px"
          mobileSubFont="12px"
          appName={t("app-name")}
          appSubInscription={t("app-catch")}
          activeBackgroundGradient="linear-gradient(to right, var(--first-theme-color) 0%, var(--second-theme-color) 90%)"
          onSignIn={onSignIn}
        />
        <div id="home">
          {isRTL ? (
            <RTLHeroSection
              topText={heroTopWords}
              subTextLine1={t("hero-subtext-first-line")}
              subTextLine2={t("hero-subtext-second-line")}
            />
          ) : (
            <HeroSection
              topText={heroTopWords}
              subTextLine1={t("hero-subtext-first-line")}
              subTextLine2={t("hero-subtext-second-line")}
            />
          )}
        </div>
        <div id="features">
          <FeaturesSection/>
        </div>
        <Section id="pricing">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            width: '100%',
            maxWidth: '1200px',
          }}>
            <StructuredBlock {...addRTLProps(headlineProps, isRTL)}>
              {t("section-pricing")}
            </StructuredBlock>
            <StructuredBlock {...addRTLProps(textProps, isRTL)}>
              {t("pricing-section-text")}
            </StructuredBlock>
            <StructuredBlock {...addRTLProps(contentProps, isRTL)}>
              <PricingCard
                title={t("pricing-card-title")}
                price={t("pricing-card-price")}
                features={[
                  t("pricing-card-feature-1"),
                  t("pricing-card-feature-2"),
                  t("pricing-card-feature-3"),
                  t("pricing-card-feature-4"),
                  t("pricing-card-feature-5"),
                  t("pricing-card-feature-6")
                ]}
                buttonText={t("pricing-card-button-inscription")}
                onButtonClick={onSignUp}
              />
            </StructuredBlock>
          </div>
        </Section>
        <div id="downloader">
          <>
          <LandingPageDownloader/>
          <Section1>
            <Container>
              <StructuredBlock {...addRTLProps(contentPropsForFooter, isRTL)}>
                <FancyFooter/>
                <div className="pt-4 text-center">
                  <a href="/terms-of-use" target="_blank" rel="noopener noreferrer" className="text-[var(--refresh-inscription-color)] cursor-pointer">
                    <span>{t('terms-of-use')}</span>
                  </a>
                </div>
                <div className="pt-2 text-center">
                  <span
                    className="text-[var(--refresh-inscription-color)] cursor-pointer"
                    onClick={openModal}
                  >
                    {t('credit')}
                  </span>
                </div>
              </StructuredBlock>
            </Container>
          </Section1>
          </>
        </div>
      </div>
      <CreditModal isOpen={isCreditModalOpen} onClose={closeModal} />
    </I18nextProvider>
  );
};

const Section1 = styled.div<{ }>`
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0px;
  justify-content: flex-start;
  align-items: stretch;
  width: 100%;
  max-width: 1200px;
  position: relative;
`;

const Section = styled.div<{ id: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const addRTLProps = (
  props: typeof headlineProps | typeof textProps,
  isRTL: boolean
) => ({
  ...props,
  desktopTextAlign: isRTL ? ("right" as "right") : ("left" as "left"),
  textDirection: isRTL ? ("rtl" as "rtl") : ("ltr" as "ltr"),
});

const headlineProps = {
  textColor: "var(--foreground)",
  desktopPadding: {
    left: "20px",
    right: "20px",
    top: "0px",
    bottom: "0px",
  },
  mobilePadding: {
    left: "4px",
    right: "4px",
    top: "0px",
    bottom: "0px",
  },
  desktopFontSize: "56px",
  mobileFontSize: "32px",
};

const textProps = {
  textColor: "var(--foreground)",
  desktopPadding: {
    left: "23px",
    right: "23px",
    top: "6px",
    bottom: "24px",
  },
  mobilePadding: {
    left: "10px",
    right: "10px",
    top: "3px",
    bottom: "16px",
  },
  desktopFontSize: "18px",
  mobileFontSize: "14px",
};

const contentProps = {
  textColor: "var(--foreground)",
  desktopPadding: {
    left: "24px",
    right: "24px",
    top: "2px",
    bottom: "40px",
  },
  mobilePadding: {
    left: "10px",
    right: "10px",
    top: "0px",
    bottom: "40px",
  },
  desktopFontSize: "18px",
  mobileFontSize: "14px",
};

const contentPropsForFooter = {
  textColor: "var(--foreground)",
  desktopPadding: {
    left: "24px",
    right: "24px",
    top: "2px",
    bottom: "14px",
  },
  mobilePadding: {
    left: "10px",
    right: "10px",
    top: "0px",
    bottom: "14px",
  },
  desktopFontSize: "16px",
  mobileFontSize: "14px",
};

export default LandingPage;
