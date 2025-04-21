import React from 'react';
import { FeatureData } from './FeaturesSwitcher';
import { SpotlightCard } from './SpotlightCard';
import dynamic from 'next/dynamic';

const Player = dynamic(
  () => import('@lottiefiles/react-lottie-player').then(mod => mod.Player),
  { ssr: false }
);

interface MobileFeaturesProps {
  features: FeatureData[];
  isRTL: boolean;
}

const MobileFeatures: React.FC<MobileFeaturesProps> = ({ features, isRTL }) => {
  const renderFeatureCard = (feature: FeatureData, index: number) => (
    <SpotlightCard key={index} className="feature-card" spotlightColor={feature.highlightColor}>
      <div style={{
        backgroundColor: feature.backgroundColor,
        padding: '20px',
        height: '100%',
        direction: isRTL ? 'rtl' : 'ltr',
        textAlign: isRTL ? 'right' : 'left',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Player
            autoplay
            loop
            src={feature.animationSrc}
            style={feature.mobileIconSize}
          />
        </div>
        <div style={{ marginTop: '20px' }}>
          <h3 style={{
            fontSize: '24px',
            color: 'var(--foreground)',
            fontWeight: 'bold',
            marginBottom: '6px',
          }}>{feature.title}</h3>
          <p style={{ fontSize: '14px', color: '#eeeeee' }}>{feature.description}</p>
        </div>
      </div>
    </SpotlightCard>
  );

  return (
    <div style={{
      display: 'grid',
      gap: '10px',
      gridTemplateColumns: '1fr',
    }}>
      {features.map((feature, index) => renderFeatureCard(feature, index))}
    </div>
  );
};

export default MobileFeatures;
