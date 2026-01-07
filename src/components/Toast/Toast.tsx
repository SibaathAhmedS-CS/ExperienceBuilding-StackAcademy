'use client';

import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose, 
  duration = 3000 
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className={`${styles.toast} ${styles[type]} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.toastContent}>
        <div className={styles.iconWrapper}>
          <CheckCircle2 size={20} />
        </div>
        <span className={styles.message}>{message}</span>
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

