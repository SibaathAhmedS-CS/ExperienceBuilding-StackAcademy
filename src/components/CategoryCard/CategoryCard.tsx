'use client';

import Link from 'next/link';
import { 
  Code, 
  Briefcase, 
  Palette, 
  BarChart3, 
  Users,
  Cloud,
  Shield,
  Smartphone,
  Brain,
  Camera,
  Megaphone,
  Heart,
  LucideIcon
} from 'lucide-react';
import styles from './CategoryCard.module.css';
import { getLivePreviewAttributes } from '@/utils/livePreview';

interface CategoryCardProps {
  uid: string;
  title: string;
  slug: string;
  description?: string;
  icon?: string;
  courseCount?: number;
  isActive?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'button';
  _originalCategory?: any; // Original category entry with $ properties for Live Preview
}

const iconMap: Record<string, LucideIcon> = {
  code: Code,
  briefcase: Briefcase,
  palette: Palette,
  chart: BarChart3,
  users: Users,
  cloud: Cloud,
  shield: Shield,
  smartphone: Smartphone,
  brain: Brain,
  camera: Camera,
  megaphone: Megaphone,
  heart: Heart,
};

const colorMap: Record<string, { bg: string; color: string; gradient: string }> = {
  code: { bg: '#dbeafe', color: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
  briefcase: { bg: '#dcfce7', color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a, #22c55e)' },
  palette: { bg: '#f3e8ff', color: '#9333ea', gradient: 'linear-gradient(135deg, #9333ea, #a855f7)' },
  chart: { bg: '#fef3c7', color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)' },
  users: { bg: '#fee2e2', color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626, #ef4444)' },
  cloud: { bg: '#dbeafe', color: '#0284c7', gradient: 'linear-gradient(135deg, #0284c7, #0ea5e9)' },
  shield: { bg: '#ede9fe', color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #9333ea)' },
  smartphone: { bg: '#cffafe', color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)' },
  brain: { bg: '#fef9c3', color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)' },
  camera: { bg: '#fce7f3', color: '#db2777', gradient: 'linear-gradient(135deg, #db2777, #ec4899)' },
  megaphone: { bg: '#dbeafe', color: '#0284c7', gradient: 'linear-gradient(135deg, #0284c7, #0ea5e9)' },
  heart: { bg: '#ffe4e6', color: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48, #f43f5e)' },
  default: { bg: '#e0e7ff', color: '#4f46e5', gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
};

export default function CategoryCard({
  uid,
  title,
  slug,
  description,
  icon = 'code',
  courseCount,
  isActive = false,
  onClick,
  variant = 'default',
  _originalCategory,
}: CategoryCardProps) {
  const IconComponent = iconMap[icon] || Code;
  const colors = colorMap[icon] || colorMap.default;

  // Get live preview attributes from original category entry
  const livePreviewAttrs = _originalCategory ? getLivePreviewAttributes(_originalCategory.$) : undefined;
  const titleAttrs = _originalCategory ? getLivePreviewAttributes(_originalCategory.$?.title) : undefined;
  
  if (variant === 'button') {
    return (
      <button
        className={`${styles.buttonCard} ${isActive ? styles.active : ''}`}
        onClick={onClick}
        style={{
          '--category-bg': colors.bg,
          '--category-color': colors.color,
          '--category-gradient': colors.gradient,
        } as React.CSSProperties}
        {...livePreviewAttrs}
      >
        <div className={styles.buttonIcon} {...getLivePreviewAttributes(_originalCategory?.$?.category_icon)}>
          <IconComponent size={20} />
        </div>
        <span className={styles.buttonLabel} {...titleAttrs}>{title}</span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href={`/categories/${slug}`}
        className={styles.compactCard}
        style={{
          '--category-bg': colors.bg,
          '--category-color': colors.color,
          '--category-gradient': colors.gradient,
        } as React.CSSProperties}
        {...livePreviewAttrs}
      >
        <div className={styles.compactIcon} {...getLivePreviewAttributes(_originalCategory?.$?.category_icon)}>
          <IconComponent size={22} />
        </div>
        <div className={styles.compactContent}>
          <h4 className={styles.compactTitle} {...titleAttrs}>{title}</h4>
          {courseCount !== undefined && (
            <span className={styles.compactCount}>{courseCount} Courses</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/categories/${slug}`}
      className={styles.card}
      style={{
        '--category-bg': colors.bg,
        '--category-color': colors.color,
        '--category-gradient': colors.gradient,
      } as React.CSSProperties}
      {...livePreviewAttrs}
    >
      <div className={styles.iconWrapper} {...getLivePreviewAttributes(_originalCategory?.$?.category_icon)}>
        <IconComponent size={28} />
      </div>
      <h3 className={styles.title} {...titleAttrs}>{title}</h3>
      {description && (
        <p className={styles.description} {...getLivePreviewAttributes(_originalCategory?.$?.description)}>
          {description}
        </p>
      )}
      {courseCount !== undefined && (
        <span className={styles.courseCount}>{courseCount} Courses</span>
      )}
      <div className={styles.hoverArrow}>
        <span>Explore</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  );
}

