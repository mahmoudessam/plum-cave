'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HalomotButton from '@/components/HalomotButton/HalomotButton';
import DreamyInput from '@/components/DreamyInput/DreamyInput';
import Navbar from '@/components/navbar/navbar';

interface LoginPageProps {
  initialMode: 'signin' | 'signup';
  onSubmit: (data: { mode: 'signin' | 'signup'; email: string; password: string; confirmPassword?: string }) => void;
  onHome: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ initialMode, onSubmit, onHome }) => {
  const [isRegistering, setIsRegistering] = useState(initialMode === 'signup');
  const { t, i18n } = useTranslation();
  const [isRTL, setIsRTL] = useState(false);
  const [gradientStyle, setGradientStyle] = useState('');
  const [mounted, setMounted] = useState(false);
  const emailRefRegister = useRef<HTMLInputElement>(null);
  const passwordRefRegister = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const emailRefLogin = useRef<HTMLInputElement>(null);
  const passwordRefLogin = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setIsRTL(i18n.language === 'he');
  }, [i18n.language]);

  useEffect(() => {
    if (mounted) {
      const newGradientStyle = isRTL ? 'linear-gradient(to right, var(--second-theme-color), var(--first-theme-color))' : 'linear-gradient(to right, var(--first-theme-color), var(--second-theme-color))';
      setGradientStyle(newGradientStyle);
    }
  }, [isRTL, mounted]);

  const handleSubmit = () => {
    if (isRegistering) {
      onSubmit({
        mode: 'signup',
        email: emailRefRegister.current?.value || '',
        password: passwordRefRegister.current?.value || '',
        confirmPassword: confirmPasswordRef.current?.value || '',
      });
    } else {
      onSubmit({
        mode: 'signin',
        email: emailRefLogin.current?.value || '',
        password: passwordRefLogin.current?.value || '',
      });
    }
  };

  const cardWidth = t('max-login-card-width', { defaultValue: '374' });

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Navbar
        sections={[]}
        desktopPadding="24px"
        mobilePadding="10px"
        desktopFont="23px"
        mobileFont="20px"
        desktopSubFont="14px"
        mobileSubFont="12px"
        appName={t("app-name")}
        appSubInscription={t("app-catch")}
        activeBackgroundGradient={gradientStyle}
        onSignIn={() => setIsRegistering(false)}
        onHomeClick={onHome}
        isLoginPage={true}
      />
      <div style={{ height: "69px" }}></div> {/* Compensate for navbar height */}
      <div
        className="flex items-center justify-center min-h-[calc(100vh-69px)] px-2.5 sm:px-6"
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ background: 'var(--background)' }}
      >
        <div
          className="w-full"
          style={{
            maxWidth: `${cardWidth}px`,
            background: 'var(--card-background)',
            outline: '1px solid var(--lightened-background-adjacent-color)',
          }}
        >
          <div className="flex flex-col justify-center p-6 text-[var(--foreground)]">
            {isRegistering ? (
              <>
                <h1 className="text-4xl font-bold mt-3 mb-[10px]">{t('register')}</h1>
                <p className="mb-6" style={{ fontSize: '16px' }}>
                  {t('create_an_account')}
                </p>
                <form className="flex flex-col w-full" onSubmit={handleSubmit}>
                  <div className="mb-2">
                    <DreamyInput
                      ref={emailRefRegister}
                      placeholder={t('email')}
                      outlineColor={gradientStyle}
                      outlineColorHover={gradientStyle}
                      backgroundColor="var(--background)"
                    />
                  </div>
                  <div className="mb-2">
                    <DreamyInput
                      ref={passwordRefRegister}
                      type='password'
                      placeholder={t('password')}
                      outlineColor={gradientStyle}
                      outlineColorHover={gradientStyle}
                      backgroundColor="var(--background)"
                    />
                  </div>
                  <div className="mb-4">
                    <DreamyInput
                      ref={confirmPasswordRef}
                      type='password'
                      placeholder={t('confirm_password')}
                      outlineColor={gradientStyle}
                      outlineColorHover={gradientStyle}
                      backgroundColor="var(--background)"
                    />
                  </div>
                  <div style={{ width: '100%', padding: 0 }}>
                    <HalomotButton
                      text={t('register_button_label')}
                      fillWidth
                      onClick={handleSubmit}
                      gradient={gradientStyle}
                    />
                  </div>
                </form>
                <p className="mt-9" style={{ fontSize: '16px' }}>
                  {t('already_have_account')}{' '}
                  <span
                    className="underline cursor-pointer ml-1"
                    onClick={() => setIsRegistering(false)}
                  >
                    {t('log_in_bottom')}
                  </span>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold mb-2">{t('log_in_top')}</h1>
                <p className="mb-6" style={{ fontSize: '16px' }}>
                  {t('sign_in_to_your_account')}
                </p>
                <form className="flex flex-col w-full" onSubmit={handleSubmit}>
                  <div className="mb-2">
                    <DreamyInput
                      ref={emailRefLogin}
                      placeholder={t('email')}
                      outlineColor={gradientStyle}
                      outlineColorHover={gradientStyle}
                      backgroundColor="var(--background)"
                    />
                  </div>
                  <div className="mb-4">
                    <DreamyInput
                      ref={passwordRefLogin}
                      type='password'
                      placeholder={t('password')}
                      outlineColor={gradientStyle}
                      outlineColorHover={gradientStyle}
                      backgroundColor="var(--background)"
                    />
                  </div>
                  <div className="w-full">
                    <HalomotButton
                      text={t('login_button_label')}
                      fillWidth
                      onClick={handleSubmit}
                      gradient={gradientStyle}
                    />
                  </div>
                </form>
                <p className="mt-9" style={{ fontSize: '16px' }}>
                  {t('no_account')}{' '}
                  <span
                    className="underline cursor-pointer ml-1"
                    onClick={() => setIsRegistering(true)}
                  >
                    {t('create_one')}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
