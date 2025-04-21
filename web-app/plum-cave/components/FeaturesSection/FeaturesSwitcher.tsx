"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import DesktopFeatures from './DesktopFeatures';
import MobileFeatures from './MobileFeatures';
import TabletFeatures from './TabletFeatures';
import StructuredBlock from '@/components/StructuredBlock/StructuredBlock';

export interface FeatureData {
  animationSrc: string;
  title: string;
  description: string;
  backgroundColor: string;
  desktopIconSize: { height: string; width: string };
  tabletIconSize: { height: string; width: string };
  mobileIconSize: { height: string; width: string };
  highlightColor: string;
}

const FeaturesSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [componentWidth, setComponentWidth] = useState(0);
  const componentRef = useRef<HTMLDivElement>(null);

  const DESKTOP_BREAKPOINT = 1152;
  const MOBILE_BREAKPOINT = 768;
  const DESKTOP_TABLET_PADDING = 24;
  const MOBILE_PADDING = 10;

  const isRTL = i18n.language === 'he';

  useEffect(() => {
    const updateWidth = () => {
      if (componentRef.current) {
        setComponentWidth(componentRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isDesktop = componentWidth >= DESKTOP_BREAKPOINT;
  const isMobile = componentWidth < MOBILE_BREAKPOINT;

  const features: FeatureData[] = [
    {
      animationSrc: "/filled-lock-animation.json",
      title: t('first-feature-name'),
      description: t('first-feature-description'),
      backgroundColor: 'var(--lightened-background-adjacent-color)',
      desktopIconSize: { height: '132px', width: '132px' },
      tabletIconSize: { height: '100px', width: '100px' },
      mobileIconSize: { height: '80px', width: '80px' },
      highlightColor: '#ffffff30',
    },
    {
      animationSrc: "/filled-cloud-animation.json",
      title: t('second-feature-name'),
      description: t('second-feature-description'),
      backgroundColor: 'var(--first-theme-color)',
      desktopIconSize: { height: '206px', width: '206px' },
      tabletIconSize: { height: '150px', width: '150px' },
      mobileIconSize: { height: '120px', width: '120px' },
      highlightColor: '#ffffff40',
    },
    {
      animationSrc: "/filled-share-animation.json",
      title: t('third-feature-name'),
      description: t('third-feature-description'),
      backgroundColor: 'var(--second-theme-color)',
      desktopIconSize: { height: '92px', width: '92px' },
      tabletIconSize: { height: '70px', width: '70px' },
      mobileIconSize: { height: '60px', width: '60px' },
      highlightColor: '#ffffff50',
    },
  ];

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
      left: "4px",
      right: "4px",
      top: "3px",
      bottom: "16px",
    },
    desktopFontSize: "18px",
    mobileFontSize: "14px",
  };

  return (
    <div ref={componentRef} style={{
      minHeight: isDesktop ? 'calc(100vh - 69px)' : 'auto',
      marginBottom: !isDesktop ? '40px' : '0',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0px', // No spacing between elements
          justifyContent: 'center', // Center elements vertically
          alignItems: 'center', // Center elements horizontally
          width: '100%',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1200px',
          }}>
            <StructuredBlock {...addRTLProps(headlineProps, isRTL)}>
              {t("section-features")}
            </StructuredBlock>
            <StructuredBlock {...addRTLProps(textProps, isRTL)}>
              {isDesktop 
                ? t("features-section-text-desktop")
                : t("features-section-text-mobile")}
            </StructuredBlock>
          </div>
        </div>
        <div style={{
          padding: `0 ${isDesktop || !isMobile ? DESKTOP_TABLET_PADDING : MOBILE_PADDING}px`,
        }}>
          {isDesktop ? (
            <DesktopFeatures features={features} isRTL={isRTL} t={t} i18n={i18n} />
          ) : isMobile ? (
            <MobileFeatures features={features} isRTL={isRTL} />
          ) : (
            <TabletFeatures features={features} isRTL={isRTL} />
          )}
        </div>
      </div>
    </div>
  );
};

export default FeaturesSwitcher;
