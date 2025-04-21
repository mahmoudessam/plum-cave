"use client";
import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import gsap from "gsap";
import FancyNavbar from "@/components/FancyNavbar/FancyNavbar";
import LanguageSelector from "@/components/LanguageSelector/LanguageSelector";
import { useTranslation } from 'react-i18next';
import { IconLogin, IconLogin2 } from '@tabler/icons-react';
import LanguageIcon from '@/components/LanguageIcon';

interface NavbarProps {
  sections: { id: string; label: string }[];
  desktopPadding: string;
  mobilePadding: string;
  desktopFont: string;
  mobileFont: string;
  desktopSubFont: string;
  mobileSubFont: string;
  appName: string;
  appSubInscription: string;
  activeBackgroundGradient: string;
  disableGradualHighlight?: boolean;
  highlightBorderRadius?: string;
  bottomLineColor?: string;
  onSignIn: () => void;
  isLoginPage?: boolean;
  onHomeClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  sections,
  desktopPadding,
  mobilePadding,
  desktopFont,
  mobileFont,
  desktopSubFont,
  mobileSubFont,
  appName,
  appSubInscription,
  activeBackgroundGradient,
  disableGradualHighlight = false,
  highlightBorderRadius = "none",
  bottomLineColor = "var(--background-adjacent-color)",
  onSignIn,
  isLoginPage = false,
  onHomeClick,
}) => {
  const [activeSection, setActiveSection] = useState(() => {
    return isLoginPage ? null : sections[0]?.id || null;
  });
  const [isScrolling, setIsScrolling] = useState(false);
  const [isLanguageSelectorOpen, setIsLanguageSelectorOpen] = useState(false);
  const [clickInterval] = useState(500);
  const highlightRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [isSectionHighlightVisible, setIsSectionHighlightVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      switch (i18n.language) {
        case 'he': setIsSectionHighlightVisible(width >= 800); break;
        case 'en': setIsSectionHighlightVisible(width >= 712); break;
        case 'es_ar': setIsSectionHighlightVisible(width >= 864); break;
        default: setIsSectionHighlightVisible(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); };
  }, [i18n.language]);

  const handleSectionPositionCheck = () => {
    if (isLoginPage) return;
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 69) {
          setActiveSection(section.id);
        }
      }
    });
  };

  const handleSectionClick = (sectionId: string) => {
    if (isLoginPage) return;
    setIsScrolling(true);
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -68; // Offset for navbar height
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setTimeout(() => {
        setActiveSection(sectionId);
        setIsScrolling(false);
      }, clickInterval);
    }
  };

  useEffect(() => {
    if (isLoginPage) return;
    const handleScroll = () => {
      if (!isScrolling) {
        handleSectionPositionCheck();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections, isScrolling, isRTL, isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    const activeTab = document.querySelector<HTMLElement>(`#nav-${activeSection}`);
    if (activeTab && highlightRef.current) {
      if (disableGradualHighlight) {
        gsap.set(highlightRef.current, { width: activeTab.offsetWidth, left: activeTab.offsetLeft });
      } else {
        gsap.to(highlightRef.current, { width: activeTab.offsetWidth, left: activeTab.offsetLeft, duration: 0.5, ease: "power2.out" });
      }
    }
  }, [activeSection, disableGradualHighlight, isRTL, isLoginPage]);

  useEffect(() => {
    if (isLoginPage) return;
    handleSectionPositionCheck();
  }, [isRTL, sections, isLoginPage]);

  const handleAppNameClick = (e: React.MouseEvent) => {
    if (isLoginPage && onHomeClick) {
      e.preventDefault();
      onHomeClick();
    }
  };

  return (
    <StickyNavbarWrapper>
      <NavbarContainer
        desktopPadding={desktopPadding}
        mobilePadding={mobilePadding}
        desktopFont={desktopFont}
        mobileFont={mobileFont}
        desktopSubFont={desktopSubFont}
        mobileSubFont={mobileSubFont}
        maxWidth="1200px"
        style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}
      >
        {/* Left Section */}
        <LeftSection style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}>
        <AppNameContainer isRTL={isRTL}>
          <AppNameLink href="/" onClick={handleAppNameClick}>
            <AppName
              desktopFont={desktopFont}
              mobileFont={mobileFont}
              themeColor="white"
              foregroundHoverColor="var(--first-theme-color)"
              isRTL={isRTL}
            >
              {appName}
            </AppName>
          </AppNameLink>
        </AppNameContainer>
          <SubInscriptionContainer>
            <SubInscription
              desktopFont={desktopSubFont}
              mobileFont={mobileSubFont}
              themeColor="var(--foreground)"
            >
              {appSubInscription}
            </SubInscription>
          </SubInscriptionContainer>
        </LeftSection>
          {/* Center Section */}
          {isSectionHighlightVisible && (
            <CenterSection>
              <TabsContainer>
                {!isLoginPage && sections.map((section) => (
                  <Tab
                    key={section.id}
                    id={`nav-${section.id}`}
                    href={`#${section.id}`}
                    style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}
                  >
                    {section.label}
                  </Tab>
                ))}
                {!isLoginPage && (
                  <Highlight
                    ref={highlightRef}
                    activeBackgroundGradient={activeBackgroundGradient}
                    highlightBorderRadius={highlightBorderRadius}
                  />
                )}
              </TabsContainer>
            </CenterSection>
          )}
        {/* Right Section */}
        <RightSection style={{ transform: isRTL ? 'scaleX(-1)' : 'none' }}>
          {isRTL ? (
            <>
              <FancyNavbar
                items={[
                  { icon: <IconLogin2 width={26} height="auto" />, label: t('log-in-the-verb') },
                ]}
                onItemClick={() => onSignIn()}
                activeIconColor="var(--foreground)"
                backgroundColor="var(--navbar-background)"
                foregroundColor="var(--second-theme-color)"
              />
              <FancyNavbar
                items={[
                  { icon: <LanguageIcon width={26} />, label: "Language" },
                ]}
                onItemClick={() => setIsLanguageSelectorOpen(true)}
                activeIconColor="var(--foreground)"
                backgroundColor="var(--navbar-background)"
                foregroundColor="var(--first-theme-color)"
                removeTooltipOnClick={true}
              />
            </>
          ) : (
            <>
              <FancyNavbar
                items={[
                  { icon: <LanguageIcon width={26} />, label: "Language" },
                ]}
                onItemClick={() => setIsLanguageSelectorOpen(true)}
                activeIconColor="var(--foreground)"
                backgroundColor="var(--navbar-background)"
                foregroundColor="var(--first-theme-color)"
                removeTooltipOnClick={true}
              />
              <FancyNavbar
                items={[
                  { icon: <IconLogin width={26} height="auto" />, label: t('log-in-the-verb') },
                ]}
                onItemClick={() => onSignIn()}
                activeIconColor="var(--foreground)"
                backgroundColor="var(--navbar-background)"
                foregroundColor="var(--second-theme-color)"
              />
            </>
          )}
        </RightSection>
      </NavbarContainer>
      <BottomLine bottomLineColor={bottomLineColor} />
      <LanguageSelector isOpen={isLanguageSelectorOpen} onClose={() => setIsLanguageSelectorOpen(false)} />
    </StickyNavbarWrapper>
  );
};

const AppNameLink = styled.a`
  text-decoration: none;
  color: inherit;
`;

const StickyNavbarWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10000;
  background-color: var(--navbar-background);
`;

const NavbarContainer = styled.div<{ desktopPadding?: string; mobilePadding?: string; desktopFont?: string; mobileFont?: string; desktopSubFont?: string; mobileSubFont?: string; maxWidth?: string; }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 69px;
  max-width: ${(props) => props.maxWidth};
  margin: 0 auto;
  position: relative;
  padding: 0 ${(props) => props.desktopPadding};
  @media (max-width: 768px) {
    padding: 0 ${(props) => props.mobilePadding};
  }
`;

const LeftSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const CenterSection = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
`;

const TabsContainer = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 1rem;
  position: relative;
`;

const Tab = styled.a`
  padding: 0.5rem 1rem;
  position: relative;
  color: white;
  isolation: isolate;
  text-decoration: none;
  z-index: 1;
`;

const Highlight = styled.div<{ activeBackgroundGradient: string; highlightBorderRadius: string }>`
  position: absolute;
  bottom: 0;
  height: 100%;
  background-image: ${(props) => props.activeBackgroundGradient};
  z-index: 0;
  border-radius: ${(props) => props.highlightBorderRadius};
  transition: background-image 0.3s ease;
`;

const RightSection = styled.div`
  display: flex-row;
  flex-direction: column;
  align-items: flex-end;
`;

interface AppNameContainerProps {
  isRTL: boolean;
}

const AppNameContainer = styled.div<AppNameContainerProps>`
  display: inline-block;
  text-align: ${(props) => (props.isRTL ? 'right' : 'left')};
  width: 100%; // Ensure the container takes full width
`;

interface AppNameProps {
  desktopFont?: string;
  mobileFont?: string;
  themeColor: string;
  foregroundHoverColor: string;
  isRTL: boolean;
}

const AppName = styled.span<AppNameProps>`
  font-size: ${(props) => props.desktopFont};
  font-weight: bold;
  color: ${(props) => props.themeColor};
  transition: color 0.3s ease;
  direction: ${(props) => (props.isRTL ? 'rtl' : 'ltr')};
  @media (max-width: 768px) {
    font-size: ${(props) => props.mobileFont};
  }
  &:hover {
    color: ${(props) => props.foregroundHoverColor};
    cursor: pointer;
  }
`;

const SubInscriptionContainer = styled.div`
  display: inline-block;
`;

const SubInscription = styled.span<{ desktopFont?: string; mobileFont?: string; themeColor: string }>`
  font-size: ${(props) => props.desktopFont};
  color: ${(props) => props.themeColor};
  transition: color 0.3s ease;
  @media (max-width: 768px) {
    font-size: ${(props) => props.mobileFont};
  }
`;

const BottomLine = styled.div<{ bottomLineColor: string }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background-color: ${(props) => props.bottomLineColor};
`;

export default Navbar;
