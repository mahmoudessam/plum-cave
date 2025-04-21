"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './Loader.module.css';

const Loader: React.FC = () => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`${styles.loaderContainer}`}>
      <div className={styles.loaderContent}>
        <Image src="/logo.webp" alt="Plum Cave Logo" width={512} height={512} className={styles.logo} />
        <span className={styles.appName}>Plum Cave</span>
      </div>
    </div>
  );
};

export default Loader;