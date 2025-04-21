'use client';
import React, { useEffect, useState } from 'react';
import InfoCard from '@/components/InfoCard/InfoCard';
import { useTranslation } from 'react-i18next';
import HalomotButton from '@/components/HalomotButton/HalomotButton';

interface DashboardContentProps {
  totalProjects: string;
  totalBackups: string;
  totalBackupSize: string;
  receivedBackups: string;
  onCreateProject: () => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  totalProjects,
  totalBackups,
  totalBackupSize,
  receivedBackups,
  onCreateProject
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [windowWidth, setWindowWidth] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  const cards = [
    { title: t('projects'), inscription: totalProjects },
    { title: t('backups'), inscription: totalBackups },
    { title: t('total-backup-size'), inscription: `${totalBackupSize}` },
    { title: t('received-backups'), inscription: `${receivedBackups}` }
  ];

  const getOrderedCards = () => {
    if (!isRTL) return cards;
    if (windowWidth >= 2560) {
      return [cards[3], cards[2], cards[1], cards[0]]; // Reverse order for 4-column layout
    }
    if (windowWidth >= 1280) {
      return [cards[1], cards[0], cards[3], cards[2]]; // Custom order for 2-column layout
    }
    return cards; // Do not reverse in single-column layout
  };

  const getGridClass = () => {
    if (windowWidth >= 2560) return 'grid-cols-4';
    if (windowWidth >= 1280) return 'grid-cols-2';
    return 'grid-cols-1';
  };

  const orderedCards = getOrderedCards();

  return (
    <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
      <h1 className="text-3xl font-bold mb-6">{t('dashboard')}</h1>
      <div className={`grid ${getGridClass()} gap-6 mt-8`}>
        {orderedCards.map((card, index) => (
          <InfoCard key={index} title={card.title} inscription={card.inscription} />
        ))}
      </div>
      <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'} mt-6`}>
        <HalomotButton
          text={t('new-project-inscription')}
          onClick={onCreateProject}
          gradient={
            isRTL
              ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))'
              : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
          }
          fillWidth
        />
      </div>
    </div>
  );
};

export default DashboardContent;
