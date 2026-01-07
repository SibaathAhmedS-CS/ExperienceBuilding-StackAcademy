'use client';

import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import styles from './ReviewPopup.module.css';

interface ReviewPopupProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export default function ReviewPopup({
  courseId,
  courseTitle,
  onClose,
  onReviewSubmitted,
}: ReviewPopupProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function checkExistingReview() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: existingReview } = await supabase
          .from('course_reviews')
          .select('rating, comment')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        if (existingReview) {
          setHasExistingReview(true);
          setRating(existingReview.rating || 0);
          setComment(existingReview.comment || '');
        }
      } catch (err) {
        console.error('Error checking existing review:', err);
      }
    }

    checkExistingReview();
  }, [courseId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit a review');
        setIsSubmitting(false);
        return;
      }

      const reviewData = {
        user_id: user.id,
        course_id: courseId,
        rating: rating,
        comment: comment.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (hasExistingReview) {
        // Update existing review
        const { error: updateError } = await supabase
          .from('course_reviews')
          .update(reviewData)
          .eq('user_id', user.id)
          .eq('course_id', courseId);

        if (updateError) throw updateError;
      } else {
        // Insert new review
        const { error: insertError } = await supabase
          .from('course_reviews')
          .insert(reviewData);

        if (insertError) throw insertError;
      }

      onReviewSubmitted();
      onClose();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.iconWrapper}>
              <Star size={32} fill="var(--warning-500)" stroke="var(--warning-500)" />
            </div>
            <h2 className={styles.title}>
              {hasExistingReview ? 'Update Your Review' : 'Rate Your Experience'}
            </h2>
            <p className={styles.subtitle}>
              {hasExistingReview 
                ? 'Update your review for this course'
                : `How was your experience with "${courseTitle}"?`
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Star Rating */}
            <div className={styles.ratingSection}>
              <label className={styles.label}>Your Rating</label>
              <div className={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={styles.starButton}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <Star
                      size={40}
                      fill={
                        star <= (hoveredRating || rating)
                          ? 'var(--warning-500)'
                          : 'transparent'
                      }
                      stroke={
                        star <= (hoveredRating || rating)
                          ? 'var(--warning-500)'
                          : 'var(--neutral-300)'
                      }
                      className={styles.star}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className={styles.ratingText}>
                  {rating === 5 && 'Excellent!'}
                  {rating === 4 && 'Great!'}
                  {rating === 3 && 'Good'}
                  {rating === 2 && 'Fair'}
                  {rating === 1 && 'Poor'}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className={styles.commentSection}>
              <label htmlFor="comment" className={styles.label}>
                Share Your Thoughts (Optional)
              </label>
              <textarea
                id="comment"
                className={styles.textarea}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell others about your experience with this course..."
                rows={5}
                maxLength={1000}
              />
              <p className={styles.charCount}>{comment.length}/1000</p>
            </div>

            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.skipButton}
                onClick={handleSkip}
                disabled={isSubmitting}
              >
                {hasExistingReview ? 'Cancel' : 'Skip'}
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? 'Submitting...' : hasExistingReview ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

