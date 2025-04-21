import React from 'react';
import { useTranslation } from 'react-i18next';
import HalomotButton from '@/components/HalomotButton/HalomotButton';
import { db, auth } from '@/app/lib/firebase';
import { doc, setDoc, getDoc, collection } from "firebase/firestore"; 


interface LanguageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

import { languages } from '@/app/lib/language';

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();

  if (!isOpen) return null;

  const handleLanguageSelect = (langCode: string) => {
    i18n.changeLanguage(langCode);
        try{
          const user = auth.currentUser;
          if (user) {    
            const userSettings = {
              language: i18n.language,
            };
            const docRef = doc(collection(db, 'data'), `${user.email}/private/settings`);
            setDoc(docRef, userSettings);
          }
        } catch{
    
        }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: "rgba(21, 20, 25, 0.7)",
      backdropFilter: "blur(10px) saturate(90%)",
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: 'var(--background)',
        padding: '20px',
        border: '1px solid var(--background-adjacent-color)',
        maxWidth: '402px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        color: '#f7f7ff',
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '20px', 
          fontSize: '32px',
          fontWeight: 'bold'
        }}>
          Language
        </h2>
        <div style={{
          overflowY: 'auto',
          flexGrow: 1,
          marginBottom: '20px',
        }}>
          {languages.map((lang) => (
            <div key={lang.code} style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1px',
              cursor: 'pointer',
              backgroundColor: i18n.language === lang.code ? 'var(--background-adjacent-color)' : 'transparent',
              padding: '20px',
              transform: lang.code === 'he' ? 'scaleX(-1)' : 'none',
            }} onClick={() => handleLanguageSelect(lang.code)}>
              <img 
                src={lang.flag} 
                alt={lang.name} 
                width={123} 
                height="auto" 
                style={{ 
                  marginRight: '10px',
                  transform: lang.code === 'he' ? 'scaleX(-1)' : 'none',
                }} 
              />
              <span style={{
                transform: lang.code === 'he' ? 'scaleX(-1)' : 'none',
                wordBreak: 'keep-all',
                whiteSpace: 'normal',
                fontSize: 'clamp(16px, 3vw, 20px)',
                lineHeight: '1.2',
              }}>{lang.name}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <HalomotButton
            text={t('ok_button')}
            onClick={onClose}
            gradient={
              i18n.language === 'he'
                ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))'
                : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))'
            }
          />
        </div>
        <div style={{ height: "19px" }}></div> {/* Compensate for navbar height */}
      </div>
    </div>
  );
};

export default LanguageSelector;