'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, Clock, Users, BookOpen } from 'lucide-react';
import styles from './CourseCard.module.css';

interface CourseCardProps {
  uid: string;
  title: string;
  slug: string;
  thumbnail: string;
  instructorName: string;
  instructorAvatar?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  rating: number;
  reviewsCount: number;
  studentsEnrolled: number;
  category?: string;
  isFeatured?: boolean;
  isPopular?: boolean;
  progress?: number; // For enrolled courses
  variant?: 'default' | 'horizontal' | 'compact';
  redirectTo?: string; // Override the default navigation (e.g., redirect to signup for non-logged-in users)
}

export default function CourseCard({
  uid,
  title,
  slug,
  thumbnail,
  instructorName,
  instructorAvatar,
  level,
  duration,
  rating,
  reviewsCount,
  studentsEnrolled,
  category,
  isFeatured,
  isPopular,
  progress,
  variant = 'default',
  redirectTo,
}: CourseCardProps) {
  const levelColors = {
    beginner: 'var(--success-500)',
    intermediate: 'var(--warning-500)',
    advanced: 'var(--error-500)',
  };

  const formatStudents = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  // Use redirectTo if provided, otherwise navigate to course detail page
  const href = redirectTo || `/course/${slug}`;

  return (
    <Link 
      href={href} 
      className={`${styles.card} ${styles[variant]}`}
    >
      {/* Thumbnail */}
      <div className={styles.thumbnail}>
        <Image
          src={thumbnail || '/images/course-placeholder.jpg'}
          alt={title}
          fill
          className={styles.thumbnailImage}
        />
        
        {/* Badges */}
        <div className={styles.badges}>
          {isFeatured && (
            <span className={styles.badgeFeatured}>Featured</span>
          )}
          {isPopular && (
            <span className={styles.badgePopular}>Popular</span>
          )}
          {category && (
            <span className={styles.badgeCategory}>{category}</span>
          )}
        </div>

        {/* Progress Bar (for enrolled courses) */}
        {progress !== undefined && (
          <div className={styles.progressWrapper}>
            <div 
              className={styles.progressBar}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Level Badge */}
        <div className={styles.levelBadge} style={{ color: levelColors[level] }}>
          <span className={styles.levelDot} style={{ background: levelColors[level] }} />
          {level.charAt(0).toUpperCase() + level.slice(1)}
        </div>

        {/* Title */}
        <h3 className={styles.title}>{title}</h3>

        {/* Instructor */}
        <div className={styles.instructor}>
          <div className={styles.instructorAvatar}>
            {instructorAvatar ? (
              <Image src={instructorAvatar} alt={instructorName} fill />
            ) : (
              <span>{instructorName.charAt(0)}</span>
            )}
          </div>
          <span className={styles.instructorName}>{instructorName}</span>
        </div>

        {/* Meta Info */}
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <Clock size={14} />
            <span>{duration}</span>
          </div>
          <div className={styles.metaItem}>
            <BookOpen size={14} />
            <span>12 Modules</span>
          </div>
          <div className={styles.metaItem}>
            <Users size={14} />
            <span>{formatStudents(studentsEnrolled)}</span>
          </div>
        </div>

        {/* Rating */}
        <div className={styles.footer}>
          <div className={styles.rating}>
            <Star size={16} fill="var(--warning-500)" stroke="var(--warning-500)" />
            <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
            <span className={styles.reviewsCount}>({reviewsCount.toLocaleString()})</span>
          </div>
        </div>

        {/* Progress Text (for enrolled courses) */}
        {progress !== undefined && (
          <div className={styles.progressText}>
            {progress === 100 ? (
              <span className={styles.completed}>Completed!</span>
            ) : (
              <span>{progress}% Complete</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
