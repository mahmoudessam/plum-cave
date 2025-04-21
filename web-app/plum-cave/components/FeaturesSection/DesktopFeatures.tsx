"use client"
import React from 'react';
import FancyHeroSection from '@/components/FancyHeroSection/FancyHeroSection';
import { FeatureData } from './FeaturesSwitcher';
import dynamic from 'next/dynamic';
import { Lock, CloudUpload, Share } from 'lucide-react'; // Import the matching icons from the Lucid icons pack

const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), { ssr: false });

interface DesktopFeaturesProps {
  features: FeatureData[];
  isRTL: boolean;
  t: (key: string) => string;
  i18n: { language: string; };
}

const localFeatures = [
  {
    icon: <Lock size="104px"/>,
    title: 'first-feature-name',
    description: 'first-feature-description',
    backgroundColor: 'var(--lightened-background-adjacent-color)',
    desktopIconSize: { height: '132px', width: '132px' },
    tabletIconSize: { height: '100px', width: '100px' },
    mobileIconSize: { height: '80px', width: '80px' },
    highlightColor: '#ffffff30',
  },
  {
    icon: <CloudUpload size="104px"/>,
    title: 'second-feature-name',
    description: 'second-feature-description',
    backgroundColor: 'var(--first-theme-color)',
    desktopIconSize: { height: '206px', width: '206px' },
    tabletIconSize: { height: '150px', width: '150px' },
    mobileIconSize: { height: '120px', width: '120px' },
    highlightColor: '#ffffff40',
  },
  {
    icon: <Share size="104px"/>,
    title: 'third-feature-name',
    description: 'third-feature-description',
    backgroundColor: 'var(--second-theme-color)',
    desktopIconSize: { height: '92px', width: '92px' },
    tabletIconSize: { height: '70px', width: '70px' },
    mobileIconSize: { height: '60px', width: '60px' },
    highlightColor: '#ffffff50',
  },
];

const DesktopFeatures: React.FC<DesktopFeaturesProps> = ({ features, isRTL, t, i18n }) => {
  const getLocalizedText = () => {
    switch (i18n.language) {
      case 'en':
        return ["\u00A0PLUM CAVE\u00A0", "\u00A0OFFERS\u00A0", "\u00A0YOU\u00A0"];
      case 'he':
        return ["\u00A0פלאם קייב\u00A0", "\u00A0מציע\u00A0", "\u00A0לך\u00A0"];
      case 'es_ar':
        return ["\u00A0PLUM CAVE\u00A0", "\u00A0LE OFRECE\u00A0"];
      default:
        return ["\u00A0PLUM CAVE\u00A0", "\u00A0OFFERS\u00A0", "\u00A0YOU\u00A0"];
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', justifyContent: 'flex-start', alignItems: 'stretch', width: '100%', maxWidth: '1200px' }}>
      </div>
      <div style={{ transform: 'translateY(-30px)', width: '100%' }}>
        <FancyHeroSection
          text={getLocalizedText()}
          customWidth="100%"
          customHeight="820px"
          customFontSize="7rem"
          backgroundColor="transparent"
          hoverTextColor="var(--background)"
          customImageData={localFeatures.map((feature, index) => ({
            component: (
              <div
                className={`w-full h-full flex items-center justify-center text-white`}
                style={{ backgroundColor: feature.backgroundColor }}
              >
                {feature.icon}
              </div>
            ),
            title: t(feature.title),
            description: t(feature.description),
          }))}
          framerSize={[336, 190]}
          textBottom="-378px"
          titleColor="var(--foreground)"
          titleSize="30px"
          descriptionColor="#eeeeee"
          descriptionSize="16px"
        />
      </div>
    </>
  );
};

export default DesktopFeatures;
