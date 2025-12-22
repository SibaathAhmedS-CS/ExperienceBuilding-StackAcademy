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
  code: { bg: '#eef2ff', color: '#4f46e5', gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
  briefcase: { bg: '#f0fdf4', color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a, #22c55e)' },
  palette: { bg: '#fdf4ff', color: '#c026d3', gradient: 'linear-gradient(135deg, #c026d3, #e879f9)' },
  chart: { bg: '#fff7ed', color: '#ea580c', gradient: 'linear-gradient(135deg, #ea580c, #fb923c)' },
  users: { bg: '#fef2f2', color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626, #f87171)' },
  cloud: { bg: '#f0f9ff', color: '#0284c7', gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)' },
  shield: { bg: '#f5f3ff', color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  smartphone: { bg: '#ecfeff', color: '#0891b2', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
  brain: { bg: '#fef3c7', color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
  camera: { bg: '#fce7f3', color: '#db2777', gradient: 'linear-gradient(135deg, #db2777, #f472b6)' },
  megaphone: { bg: '#e0f2fe', color: '#0369a1', gradient: 'linear-gradient(135deg, #0369a1, #0ea5e9)' },
  heart: { bg: '#ffe4e6', color: '#e11d48', gradient: 'linear-gradient(135deg, #e11d48, #fb7185)' },
  default: { bg: '#f3f4f6', color: '#374151', gradient: 'linear-gradient(135deg, #374151, #6b7280)' },
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
}: CategoryCardProps) {
  const IconComponent = iconMap[icon] || Code;
  const colors = colorMap[icon] || colorMap.default;

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
      >
        <div className={styles.buttonIcon}>
          <IconComponent size={20} />
        </div>
        <span className={styles.buttonLabel}>{title}</span>
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
      >
        <div className={styles.compactIcon}>
          <IconComponent size={22} />
        </div>
        <div className={styles.compactContent}>
          <h4 className={styles.compactTitle}>{title}</h4>
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
    >
      <div className={styles.iconWrapper}>
        <IconComponent size={28} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      {description && (
        <p className={styles.description}>{description}</p>
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

