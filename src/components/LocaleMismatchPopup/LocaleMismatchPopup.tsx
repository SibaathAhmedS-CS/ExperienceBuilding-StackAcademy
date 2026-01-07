'use client';

import { useEffect, useState } from 'react';
import { Globe, X, CheckCircle } from 'lucide-react';
import styles from './LocaleMismatchPopup.module.css';

interface LocaleMismatchPopupProps {
  enrolledLocale: string;
  currentLocale: string;
  onSwitchLocale: () => void;
}

const LOCALE_NAMES: Record<string, string> = {
  'en-us': 'English',
  'ta-in': 'Tamil',
  'fr-us': 'French',
  'es': 'Spanish',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
};

export default function LocaleMismatchPopup({
  enrolledLocale,
  currentLocale,
  onSwitchLocale,
}: LocaleMismatchPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  const enrolledLocaleName = LOCALE_NAMES[enrolledLocale] || enrolledLocale;
  const currentLocaleName = LOCALE_NAMES[currentLocale] || currentLocale;

  const handleContinue = () => {
    setIsVisible(false);
    onSwitchLocale();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.iconWrapper}>
          <Globe size={48} />
        </div>
        
        <h2 className={styles.title}>Language Mismatch Detected</h2>
        
        <div className={styles.content}>
          <p className={styles.message}>
            You enrolled in this course in <strong>{enrolledLocaleName}</strong>, 
            but you're currently viewing in <strong>{currentLocaleName}</strong>.
          </p>
          <p className={styles.suggestion}>
            Please switch to the enrolled language to continue with your course.
          </p>
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.switchBtn}
            onClick={handleContinue}
          >
            <CheckCircle size={20} />
            Continue with {enrolledLocaleName}
          </button>
        </div>
      </div>
    </div>
  );
}

