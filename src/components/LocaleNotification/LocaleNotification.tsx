'use client';

import { useEffect, useState } from 'react';
import { Globe, X } from 'lucide-react';
import styles from './LocaleNotification.module.css';

interface LocaleNotificationProps {
  enrolledLocale: string;
  currentLocale: string;
  onClose?: () => void;
}

const LOCALE_NAMES: Record<string, string> = {
  'en-us': 'English',
  'ta-in': 'Tamil',
  'fr-us': 'French',
  'es': 'Spanish',
};

export default function LocaleNotification({
  enrolledLocale,
  currentLocale,
  onClose,
}: LocaleNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.notification}>
      <div className={styles.iconWrapper}>
        <Globe size={20} />
      </div>
      <div className={styles.content}>
        <p className={styles.message}>
          Course enrolled in <strong>{LOCALE_NAMES[enrolledLocale] || enrolledLocale}</strong>. 
          Switched to enrolled language.
        </p>
      </div>
      <button className={styles.closeBtn} onClick={handleClose} aria-label="Close notification">
        <X size={18} />
      </button>
    </div>
  );
}

