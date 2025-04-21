import React, { useRef, useEffect, useState } from 'react';
import { FeatureData } from './FeaturesSwitcher';
import { SpotlightCard } from './SpotlightCard';
import dynamic from 'next/dynamic';

const Player = dynamic(
  () => import('@lottiefiles/react-lottie-player').then(mod => mod.Player),
  { ssr: false }
);

interface TabletFeaturesProps {
  features: FeatureData[];
  isRTL: boolean;
}

const TabletFeatures: React.FC<TabletFeaturesProps> = ({ features, isRTL }) => {
  const [bottomCardHeight, setBottomCardHeight] = useState<number | null>(null);
  const bottomCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const calculateMaxHeight = () => {
    const heights = bottomCardRefs.current.map(ref => ref?.offsetHeight ?? 0);
    const maxHeight = Math.max(...heights);
    setBottomCardHeight(maxHeight);
  };

  useEffect(() => {
    calculateMaxHeight();
    window.addEventListener('resize', calculateMaxHeight);
    window.addEventListener('languagechange', calculateMaxHeight);

    return () => {
      window.removeEventListener('resize', calculateMaxHeight);
      window.removeEventListener('languagechange', calculateMaxHeight);
    };
  }, [isRTL]);

  const renderFeatureCard = (feature: FeatureData, index: number, isLargeCard: boolean) => (
    <SpotlightCard
      key={index}
      className="feature-card"
      spotlightColor={feature.highlightColor}
    >
      <div
        style={{
          backgroundColor: feature.backgroundColor,
          padding: '20px',
          height: '100%',
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: isLargeCard ? 'auto' : '96px',
            marginBottom: isLargeCard ? '20px' : '0',
          }}
        >
          <Player autoplay loop src={feature.animationSrc} style={feature.tabletIconSize} />
        </div>
        <div style={{ marginTop: isLargeCard ? '0' : 'auto' }}>
          <h3
            style={{
              fontSize: '24px',
              color: 'var(--foreground)',
              fontWeight: 'bold',
              marginBottom: '6px',
            }}
          >
            {feature.title}
          </h3>
          <p style={{ fontSize: '14px', color: '#eeeeee' }}>{feature.description}</p>
        </div>
      </div>
    </SpotlightCard>
  );

  const orderedFeatures = isRTL ? [features[0], features[2], features[1]] : features;

  return (
    <div
      style={{
        display: 'grid',
        gap: '24px',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridAutoRows: 'auto',
        gridTemplateAreas: `
          "feature1 feature1"
          "feature2 feature3"
        `,
      }}
    >
      {orderedFeatures.map((feature, index) => {
        const gridArea =
          index === 0 ? 'feature1' : index === 1 ? 'feature2' : index === 2 ? 'feature3' : '';
        return (
          <div
            key={index}
            style={{
              gridArea,
              height: index === 0 ? 'auto' : bottomCardHeight ? `${bottomCardHeight}px` : 'auto',
            }}
            ref={index !== 0 ? (el: HTMLDivElement | null) => {
              bottomCardRefs.current[index - 1] = el;
            } : null}
          >
            {renderFeatureCard(feature, index, index === 0)}
          </div>
        );
      })}
    </div>
  );
};

export default TabletFeatures;
