'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  HelpCircle, 
  BookOpen, 
  MessageCircle,
  Info,
  LucideIcon 
} from 'lucide-react';
import styles from './FAQ.module.css';
import { useFAQ } from '@/hooks/useFAQ';
import { FAQEntry, FAQQuestionEntry, IconEntry } from '@/types/contentstack';

// Icon mapping for FAQ header icon
const iconMap: Record<string, LucideIcon> = {
  'help-circle': HelpCircle,
  'book-open': BookOpen,
  'message-circle': MessageCircle,
  'info': Info,
};

// Helper to get icon data from reference
function getIconData(icon: IconEntry | null | undefined): string {
  if (!icon) {
    return 'help-circle';
  }
  return icon.icon_name || 'help-circle';
}

// Helper to extract questions from faq_question (handles both single and array)
function extractQuestions(faqQuestion: FAQQuestionEntry | FAQQuestionEntry[] | null | undefined): { question: string; answer: string }[] {
  if (!faqQuestion) {
    return [];
  }
  
  // Handle array of references (take first one)
  const questionEntry = Array.isArray(faqQuestion) ? faqQuestion[0] : faqQuestion;
  
  if (!questionEntry || !questionEntry.questions) {
    return [];
  }
  
  return questionEntry.questions;
}

// Legacy interface for backwards compatibility
interface FAQItem {
  uid: string;
  question: string;
  answer: string;
}

interface FAQProps {
  // Legacy props (for backwards compatibility - only used if CMS data unavailable)
  items?: FAQItem[];
  title?: string;
  subtitle?: string;
  // CMS data prop
  faqData?: FAQEntry | null;
}

export default function FAQ({ 
  items: legacyItems, 
  title: legacyTitle, 
  subtitle: legacySubtitle,
  faqData: propFaqData 
}: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  
  // Fetch FAQ data from Contentstack if not provided via props
  const { faqData: fetchedFaqData, isLoading } = useFAQ();
  
  // Use props if provided, otherwise use fetched data
  const faqData = propFaqData ?? fetchedFaqData;

  // Extract questions from CMS data
  const cmsQuestions = extractQuestions(faqData?.faq_question);
  const hasCMSData = faqData && cmsQuestions.length > 0;
  
  // Debug logging for language switching
  console.log('[FAQ] Data status:', {
    hasCMSData,
    questionsCount: cmsQuestions.length,
    faqTitle: faqData?.section_title,
    isLoading,
  });
  
  // Get icon from CMS or fallback
  const iconName = hasCMSData ? getIconData(faqData?.icon) : 'help-circle';
  const HeaderIcon = iconMap[iconName] || HelpCircle;

  // PRIORITIZE CMS DATA: Use CMS title/subtitle if available
  const title = hasCMSData ? (faqData?.section_title || legacyTitle) : legacyTitle;
  const subtitle = hasCMSData ? (faqData?.section_subtitle || legacySubtitle) : legacySubtitle;
  const displayTitle = title || 'Frequently Asked Questions';

  // PRIORITIZE CMS DATA: Use CMS questions if available, otherwise legacy
  const faqItems = hasCMSData 
    ? cmsQuestions.map((q, index) => ({
        uid: `faq-${index}`,
        question: q.question,
        answer: q.answer,
      }))
    : legacyItems || [];

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  // Reset open index when FAQ data changes (e.g., language switch)
  useEffect(() => {
    setOpenIndex(0);
  }, [faqData?.uid]);

  // Show loading state or fallback while fetching
  if (isLoading && faqItems.length === 0) {
    // If loading and no legacy items, show nothing
    return null;
  }

  // Don't render if no items at all
  if (faqItems.length === 0) {
    return null;
  }

  return (
    <section className={styles.faqSection}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <HeaderIcon size={28} />
        </div>
        <h2 className={styles.title}>{displayTitle}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.faqList}>
        {faqItems.map((item, index) => (
          <div
            key={item.uid}
            className={`${styles.faqItem} ${openIndex === index ? styles.open : ''}`}
          >
            <button
              className={styles.question}
              onClick={() => toggleItem(index)}
              aria-expanded={openIndex === index}
            >
              <span className={styles.questionNumber}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className={styles.questionText}>{item.question}</span>
              <ChevronDown size={20} className={styles.chevron} />
            </button>
            <div className={styles.answerWrapper}>
              <div className={styles.answer}>
                <p>{item.answer}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
