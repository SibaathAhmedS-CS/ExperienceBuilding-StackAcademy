import { createClient } from '@/utils/supabase/client';

export interface CourseReview {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string; // User's full name from profiles table
  user_avatar_url?: string | null; // User's avatar URL from profiles table
}

export interface CourseReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * Get review statistics for a course
 */
export async function getCourseReviewStats(
  courseId: string
): Promise<CourseReviewStats> {
  const supabase = createClient();

  try {
    const { data: reviews, error } = await supabase
      .from('course_reviews')
      .select('rating')
      .eq('course_id', courseId);

    if (error) {
      console.error('Error fetching review stats:', error);
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    if (!reviews || reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const totalReviews = reviews.length;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    const averageRating = sum / totalReviews;

    const distribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      ratingDistribution: distribution,
    };
  } catch (error) {
    console.error('Error in getCourseReviewStats:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }
}

/**
 * Get top-rated reviews (4-5 stars) for a course with user data
 * Falls back to all reviews if no 4-5 star reviews exist
 */
export async function getTopReviews(
  courseId: string,
  limit: number = 5
): Promise<CourseReview[]> {
  const supabase = createClient();

  try {
    // First, try to get 4-5 star reviews
    let { data: reviews, error } = await supabase
      .from('course_reviews')
      .select(`
        id,
        user_id,
        course_id,
        rating,
        comment,
        created_at,
        updated_at,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(limit);

    // If no 4-5 star reviews found, get all reviews (fallback)
    if ((!reviews || reviews.length === 0) && !error) {
      const { data: allReviews, error: allError } = await supabase
        .from('course_reviews')
        .select(`
          id,
          user_id,
          course_id,
          rating,
          comment,
          created_at,
          updated_at,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (!allError && allReviews) {
        reviews = allReviews;
      } else if (allError) {
        console.error('Error fetching all reviews:', allError);
        error = allError;
      }
    }

    if (error) {
      console.error('Error fetching top reviews:', error);
      // If join fails, try without profiles join as fallback
      const { data: fallbackReviews, error: fallbackError } = await supabase
        .from('course_reviews')
        .select('id, user_id, course_id, rating, comment, created_at, updated_at')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (!fallbackError && fallbackReviews) {
        // Fetch profiles separately for each user
        const reviewsWithProfiles = await Promise.all(
          fallbackReviews.map(async (review: any) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', review.user_id)
              .maybeSingle();
            
            return {
              ...review,
              user_name: profile?.full_name || 'Anonymous',
              user_avatar_url: profile?.avatar_url || null,
            };
          })
        );
        
        return reviewsWithProfiles;
      }
      
      return [];
    }

    // Transform the data to include user name and avatar
    return (reviews || []).map((review: any) => ({
      id: review.id,
      user_id: review.user_id,
      course_id: review.course_id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      updated_at: review.updated_at,
      user_name: review.profiles?.full_name || 'Anonymous',
      user_avatar_url: review.profiles?.avatar_url || null,
    }));
  } catch (error) {
    console.error('Error in getTopReviews:', error);
    return [];
  }
}

/**
 * Get all reviews for a course with user data
 */
export async function getCourseReviews(
  courseId: string
): Promise<CourseReview[]> {
  const supabase = createClient();

  try {
    const { data: reviews, error } = await supabase
      .from('course_reviews')
      .select(`
        id,
        user_id,
        course_id,
        rating,
        comment,
        created_at,
        updated_at,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }

    // Transform the data to include user name and avatar
    return (reviews || []).map((review: any) => ({
      id: review.id,
      user_id: review.user_id,
      course_id: review.course_id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      updated_at: review.updated_at,
      user_name: review.profiles?.full_name || 'Anonymous',
      user_avatar_url: review.profiles?.avatar_url || null,
    }));
  } catch (error) {
    console.error('Error in getCourseReviews:', error);
    return [];
  }
}

/**
 * Get user's review for a course
 */
export async function getUserReview(
  courseId: string,
  userId: string
): Promise<CourseReview | null> {
  const supabase = createClient();

  try {
    const { data: review, error } = await supabase
      .from('course_reviews')
      .select('id, user_id, course_id, rating, comment, created_at, updated_at')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user review:', error);
      return null;
    }

    return review;
  } catch (error) {
    console.error('Error in getUserReview:', error);
    return null;
  }
}

/**
 * Get total enrolled students count for a course
 */
export async function getCourseEnrollmentCount(
  courseId: string
): Promise<number> {
  const supabase = createClient();

  try {
    const { count, error } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);

    if (error) {
      console.error('Error fetching enrollment count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getCourseEnrollmentCount:', error);
    return 0;
  }
}

/**
 * Get instructor statistics based on all courses by the author
 * Returns average rating, total courses count, and total students enrolled
 */
export interface InstructorStats {
  averageRating: number;
  coursesCount: number;
  studentsCount: number;
}

export async function getInstructorStats(
  authorUid: string,
  courseUids: string[]
): Promise<InstructorStats> {
  const supabase = createClient();

  try {
    // If no courses, return zero stats
    if (courseUids.length === 0) {
      return {
        averageRating: 0,
        coursesCount: 0,
        studentsCount: 0,
      };
    }

    // Get all reviews for courses by this author
    const { data: reviews, error: reviewsError } = await supabase
      .from('course_reviews')
      .select('rating')
      .in('course_id', courseUids);

    // Calculate average rating
    let averageRating = 0;
    if (!reviewsError && reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
      averageRating = Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal
    }

    // Get total students enrolled across all courses
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('course_id')
      .in('course_id', courseUids);

    const studentsCount = !enrollmentsError && enrollments ? enrollments.length : 0;

    return {
      averageRating,
      coursesCount: courseUids.length,
      studentsCount,
    };
  } catch (error) {
    console.error('Error in getInstructorStats:', error);
    return {
      averageRating: 0,
      coursesCount: courseUids.length,
      studentsCount: 0,
    };
  }
}

