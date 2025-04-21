"use client"
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComponentItem {
  id: string;
  name: string;
  icon?: React.ReactElement;
  integrity?: boolean; // Added integrity property
}

interface SectionItem {
  title: string;
  components: ComponentItem[];
}

interface UnfoldingSidebarProps {
  logo: string;
  appName: string;
  sections: SectionItem[];
  onComponentClick: (componentId: string) => void;
  onAppNameClick: () => void;
  initialOpenState?: boolean;
  defaultActiveComponent?: string;
  unfoldIcon: React.ReactElement;
  foldIcon: React.ReactElement;
  iconColor?: string;
  iconHoverColor?: string;
  foldIconRotation?: number;
  unfoldIconRotation?: number;
  backgroundColor?: string;
  headerBackgroundColor?: string;
  textColor?: string;
  activeTextColor?: string;
  hoverBackgroundColor?: string;
  activeBackgroundColor?: string;
  sidebarWidth?: string;
  collapsedWidth?: string;
  headerHeight?: string;
  appNameFontSize?: string;
  sectionTitleFontSize?: string;
  componentFontSize?: string;
  iconSize?: number;
  rightStripeColor?: string;
  rightStripeHoverColor?: string;
  itemBorderRadius?: string;
  appNameColor?: string;
  sectionTitleColor?: string;
  componentHeight?: string;
  appNameYOffset?: string;
  isRTL?: boolean;
}

const UnfoldingSidebar: React.FC<UnfoldingSidebarProps> = ({
  logo,
  appName,
  sections,
  onComponentClick,
  onAppNameClick,
  initialOpenState = true,
  defaultActiveComponent,
  unfoldIcon,
  foldIcon,
  iconColor = "#a2a2a9",
  iconHoverColor = "#ffffff",
  foldIconRotation = 0,
  unfoldIconRotation = 0,
  backgroundColor = "#161618",
  headerBackgroundColor = "#151515",
  textColor = "#a2a2a9",
  activeTextColor = "#a8b1ff",
  hoverBackgroundColor = "#2c2c2a",
  activeBackgroundColor = "#252630",
  sidebarWidth = "256px",
  collapsedWidth = "54px",
  headerHeight = "50px",
  appNameFontSize = "16px",
  sectionTitleFontSize = "15px",
  componentFontSize = "14px",
  iconSize = 25,
  rightStripeColor = "#2c2c2a",
  rightStripeHoverColor = "#3c3c3a",
  itemBorderRadius = "8px",
  appNameColor = "#ffffff",
  sectionTitleColor = "#f7f7ff",
  componentHeight = '33px',
  appNameYOffset = '1px',
  isRTL = false,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialOpenState);
  const [activeComponent, setActiveComponent] = useState<string | null>(defaultActiveComponent || null);
  const [isContentVisible, setIsContentVisible] = useState(initialOpenState);
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [isAppNameHovered, setIsAppNameHovered] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleComponentClick = (componentId: string) => {
    setActiveComponent(componentId);
    onComponentClick(componentId);
  };

  const handleAppNameClick = () => {
    setActiveComponent(null);
    onAppNameClick();
  };

  const toggleSidebar = () => {
    if (isSidebarOpen) {
      setIsContentVisible(false);
      setTimeout(() => setIsSidebarOpen(false), 300);
    } else {
      setIsSidebarOpen(true);
      setTimeout(() => setIsContentVisible(true), 300);
    }
  };

  return (
    <motion.aside
      ref={sidebarRef}
      initial={{ width: isSidebarOpen ? sidebarWidth : collapsedWidth }}
      animate={{ width: isSidebarOpen ? sidebarWidth : collapsedWidth }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col flex-shrink-0 relative h-screen"
      style={{ backgroundColor, [isRTL ? 'right' : 'left']: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <nav
        className={`flex items-center p-4 relative ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}
        style={{ backgroundColor: headerBackgroundColor, height: headerHeight }}
      >
        {isRTL ? (
          <button
            onClick={toggleSidebar}
            className="transition-colors duration-200"
            style={{ color: isHovered ? iconHoverColor : iconColor, transform: isRTL ? 'scaleX(-1)' : 'none' }}
          >
            {isSidebarOpen
              ? React.cloneElement(foldIcon, { size: iconSize, style: { transform: `rotate(${foldIconRotation}deg)` } })
              : React.cloneElement(unfoldIcon, { size: iconSize, style: { transform: `rotate(${unfoldIconRotation}deg)` } })}
          </button>
        ) : (
          <></>
        )}
        <AnimatePresence>
          {isContentVisible && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex items-center">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onAppNameClick();
                }}
                onMouseEnter={() => setIsAppNameHovered(true)}
                onMouseLeave={() => setIsAppNameHovered(false)}
              >
                <div
                  className="flex items-center cursor-pointer"
                  onClick={handleAppNameClick}
                  onMouseEnter={() => setIsAppNameHovered(true)}
                  onMouseLeave={() => setIsAppNameHovered(false)}
                >
                  {isRTL ? (
                    <>
                      <span
                        className="font-bold"
                        style={{
                          fontSize: appNameFontSize,
                          color: isAppNameHovered ? 'var(--first-theme-color)' : appNameColor,
                          transition: 'color 0.3s',
                          transform: `translateY(${appNameYOffset})`,
                        }}
                      >
                        {appName}
                      </span>
                      <img src={logo} alt={`${appName} logo`} className="w-[24px] h-[24px] ml-2" />
                    </>
                  ) : (
                    <>
                      <img src={logo} alt={`${appName} logo`} className="w-[24px] h-[24px] mr-2" />
                      <span
                        className="font-bold"
                        style={{
                          fontSize: appNameFontSize,
                          color: isAppNameHovered ? 'var(--first-theme-color)' : appNameColor,
                          transition: 'color 0.3s',
                          transform: `translateY(${appNameYOffset})`,
                        }}
                      >
                        {appName}
                      </span>
                    </>
                  )}
                </div>
              </a>
            </motion.div>
          )}
        </AnimatePresence>
        {!isRTL ? (
          <button
            onClick={toggleSidebar}
            className="transition-colors duration-200"
            style={{ color: isHovered ? iconHoverColor : iconColor, transform: isRTL ? 'scaleX(-1)' : 'none' }}
          >
            {isSidebarOpen
              ? React.cloneElement(foldIcon, { size: iconSize, style: { transform: `rotate(${foldIconRotation}deg)` } })
              : React.cloneElement(unfoldIcon, { size: iconSize, style: { transform: `rotate(${unfoldIconRotation}deg)` } })}
          </button>
        ) : (
          <></>
        )}
        { isSidebarOpen &&
        <div
          style={{
            position: 'absolute',
            bottom: '-1px',
            left: '5%',
            width: '90%',
            height: '1px',
            backgroundColor: 'var(--card-background)',
          }}
        />
        }
      </nav>
      <AnimatePresence>
        {isContentVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-4 flex-grow overflow-y-auto ${isRTL ? 'text-right' : ''}`}
          >
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6">
                <h2 className="text-1xl mb-6 block" style={{ fontSize: sectionTitleFontSize, color: sectionTitleColor }}>
                  {section.title}
                </h2>
                <ul className="menu w-full rounded-box mt-6">
                  {section.components.map((component) => (
                    <li key={component.id} className="mb-2">
                      <button
                        onClick={() => handleComponentClick(component.id)}
                        onMouseEnter={() => setHoveredComponent(component.id)}
                        onMouseLeave={() => setHoveredComponent(null)}
                        className={`w-full px-4 transition-all duration-200 ease-in-out flex items-center ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                        style={{
                          fontSize: componentFontSize,
                          height: componentHeight,
                          color: activeComponent === component.id
                            ? activeTextColor
                            : hoveredComponent === component.id
                            ? iconHoverColor
                            : component.integrity === false
                            ? 'var(--theme-red-color)'
                            : textColor,
                          backgroundColor: activeComponent === component.id
                            ? activeBackgroundColor
                            : hoveredComponent === component.id
                            ? hoverBackgroundColor
                            : 'transparent',
                          borderRadius: itemBorderRadius,
                          fontStyle: component.integrity === false ? 'italic' : 'normal',
                        }}
                      >
                        {component.icon && React.cloneElement(component.icon, { size: iconSize, className: isRTL ? "ml-2" : "mr-2" })}
                        {component.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className="absolute top-0 bottom-0 w-[1px]"
        style={{ [isRTL ? 'left' : 'right']: 0 }}
        initial={{ backgroundColor: rightStripeColor }}
        animate={{ backgroundColor: isHovered ? rightStripeHoverColor : rightStripeColor }}
        transition={{ duration: 0.2 }}
      />
    </motion.aside>
  );
};

export default UnfoldingSidebar;
