'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Edit2, 
  Save, 
  X, 
  Calendar, 
  TrendingUp, 
  Award, 
  Clock, 
  BookOpen,
  Target,
  Briefcase,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Activity,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useHeader } from '@/hooks/useHeader';
import { createClient } from '@/utils/supabase/client';
import { getCachedUserProfile, cacheUserProfile, updateCachedUserProfile } from '@/utils/userCache';
import styles from './page.module.css';

interface UserActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // Activity intensity level
}

interface ActivityStats {
  totalLessons: number;
  totalHours: number;
  currentStreak: number;
  longestStreak: number;
  thisWeekActivity: number;
  thisMonthActivity: number;
  totalCompletedCourses: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { headerData } = useHeader('App Header');
  
  const [authUser, setAuthUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar?: string;
    coursesCompleted: number;
    coursesInProgress: number;
  } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [activityData, setActivityData] = useState<UserActivity[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalLessons: 0,
    totalHours: 0,
    currentStreak: 0,
    longestStreak: 0,
    thisWeekActivity: 0,
    thisMonthActivity: 0,
    totalCompletedCourses: 0,
  });

  // Form states
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    avatar_url: '',
  });

  // Image upload states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [preferencesForm, setPreferencesForm] = useState({
    goal: '',
    role: '',
    education: '',
    topics: [] as string[],
    schedule: '',
    daily_goal_minutes: 0,
  });

  // Fetch user data and activity
  useEffect(() => {
    async function fetchUserData() {
      setIsLoadingUser(true);
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          // Clear cache when user is not authenticated
          const { clearUserCache } = await import('@/utils/userCache');
          clearUserCache();
          setIsLoadingUser(false);
          router.push('/login');
          return;
        }

        setAuthUser(currentUser);

        // Check cache first for instant display
        const cachedProfile = getCachedUserProfile(currentUser.id);
        if (cachedProfile) {
          setUser(cachedProfile);
          setIsLoadingUser(false); // Show cached data immediately
        }

        // Fetch fresh data from Supabase in the background
        const [profileResult, enrollmentsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle(),
          supabase
            .from('enrollments')
            .select('status')
            .eq('user_id', currentUser.id)
        ]);

        const profileData = profileResult.data;
        const enrollments = enrollmentsResult.data;

        if (profileData) {
          setProfile(profileData);
          setProfileForm({
            full_name: profileData.full_name || '',
            avatar_url: profileData.avatar_url || '',
          });
          setAvatarPreview(profileData.avatar_url || null);
        }

        const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0;
        const inProgressCount = enrollments?.filter(e => e.status === 'enrolled').length || 0;

        // Format user object for Header component
        const userForHeader = {
          name: profileData?.full_name || currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email || '',
          avatar: profileData?.avatar_url || undefined,
          coursesCompleted: completedCount,
          coursesInProgress: inProgressCount,
        };
        
        // Update cache with fresh data
        cacheUserProfile(currentUser.id, userForHeader);
        
        // Update UI with fresh data (only if cache wasn't available or data changed)
        if (!cachedProfile || JSON.stringify(cachedProfile) !== JSON.stringify(userForHeader)) {
          setUser(userForHeader);
        }
        
        setIsLoadingUser(false);

        // Fetch preferences
        const { data: prefsData } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (prefsData) {
          setPreferences(prefsData);
          setPreferencesForm({
            goal: prefsData.goal || '',
            role: prefsData.role || '',
            education: prefsData.education || '',
            topics: prefsData.topics || [],
            schedule: prefsData.schedule || '',
            daily_goal_minutes: prefsData.daily_goal_minutes || 0,
          });
        }

        // Use enrollments already fetched above for totalCompletedCourses
        // Fetch activity data from lesson_progress
        const { data: lessonProgress } = await supabase
          .from('lesson_progress')
          .select('completed_at')
          .eq('user_id', currentUser.id)
          .eq('is_completed', true)
          .order('completed_at', { ascending: false });

        if (lessonProgress) {
          // Generate activity calendar data (last 365 days)
          const activityMap = new Map<string, number>();
          const today = new Date();
          const oneYearAgo = new Date(today);
          oneYearAgo.setFullYear(today.getFullYear() - 1);

          // Initialize all dates with 0
          for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            activityMap.set(dateStr, 0);
          }

          // Count activities per day
          lessonProgress.forEach((lp: any) => {
            if (lp.completed_at) {
              const dateStr = lp.completed_at.split('T')[0];
              const count = activityMap.get(dateStr) || 0;
              activityMap.set(dateStr, count + 1);
            }
          });

          // Convert to array and calculate levels
          const activities: UserActivity[] = Array.from(activityMap.entries()).map(([date, count]) => {
            let level: 0 | 1 | 2 | 3 | 4 = 0;
            if (count > 0) level = 1;
            if (count >= 2) level = 2;
            if (count >= 4) level = 3;
            if (count >= 6) level = 4;
            return { date, count, level };
          });

          setActivityData(activities);

          // Calculate stats
          const totalLessons = lessonProgress.length;
          
          // Calculate streaks
          const sortedDates = activities
            .filter(a => a.count > 0)
            .map(a => new Date(a.date))
            .sort((a, b) => b.getTime() - a.getTime());

          let currentStreak = 0;
          let longestStreak = 0;
          let tempStreak = 0;
          let lastDate: Date | null = null;

          sortedDates.forEach((date, index) => {
            if (index === 0) {
              const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff <= 1) {
                currentStreak = 1;
                tempStreak = 1;
              }
            } else if (lastDate) {
              const daysDiff = Math.floor((lastDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff === 1) {
                tempStreak++;
                if (index === 0 || sortedDates[index - 1] === today) {
                  currentStreak = tempStreak;
                }
              } else {
                tempStreak = 1;
              }
            }
            longestStreak = Math.max(longestStreak, tempStreak);
            lastDate = date;
          });

          // Calculate this week and month activity
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);

          const thisWeekActivity = activities.filter(a => {
            const date = new Date(a.date);
            return date >= weekAgo && a.count > 0;
          }).length;

          const thisMonthActivity = activities.filter(a => {
            const date = new Date(a.date);
            return date >= monthAgo && a.count > 0;
          }).length;

          // Estimate hours (assuming 30 min per lesson on average)
          const totalHours = Math.round((totalLessons * 30) / 60);

          setActivityStats({
            totalLessons,
            totalHours,
            currentStreak,
            longestStreak,
            thisWeekActivity,
            thisMonthActivity,
            totalCompletedCourses: completedCount, // Use completedCount from enrollments fetched earlier
          });
        } else {
          // If no lesson progress, still set stats with completed courses count
          setActivityStats({
            totalLessons: 0,
            totalHours: 0,
            currentStreak: 0,
            longestStreak: 0,
            thisWeekActivity: 0,
            thisMonthActivity: 0,
            totalCompletedCourses: completedCount,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [router, supabase]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!authUser) {
      console.error('No user found for avatar upload');
      return null;
    }

    try {
      setUploading(true);

      // Delete old avatar if exists and is in Supabase storage
      if (profile?.avatar_url && profile.avatar_url.includes('/avatars/')) {
        try {
          // Extract path from URL: https://project.supabase.co/storage/v1/object/public/avatars/user_id/filename.ext
          const urlParts = profile.avatar_url.split('/avatars/');
          if (urlParts.length > 1) {
            const oldPath = urlParts[1];
            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([oldPath]);
            
            if (deleteError) {
              console.warn('Error deleting old avatar (non-critical):', deleteError);
              // Continue with upload even if deletion fails
            }
          }
        } catch (error) {
          console.warn('Error deleting old avatar (non-critical):', error);
          // Continue with upload even if deletion fails
        }
      }

      // Generate unique filename with user ID folder
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;

      // Upload new avatar
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Check for specific error types
        if (uploadError.message.includes('already exists')) {
          throw new Error('File already exists. Please try again.');
        } else if (uploadError.message.includes('size')) {
          throw new Error('File size exceeds limit (5MB)');
        } else if (uploadError.message.includes('type')) {
          throw new Error('File type not allowed. Please use JPEG, PNG, GIF, or WebP');
        } else {
          throw new Error(uploadError.message || 'Failed to upload image');
        }
      }

      if (!data) {
        throw new Error('Upload succeeded but no data returned');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }
      
      // Update cache with new avatar URL
      if (authUser) {
        updateCachedUserProfile(authUser.id, { avatar: publicUrl });
      }
      
      console.log('Avatar uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      const errorMessage = error.message || 'Failed to upload image. Please try again.';
      alert(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!authUser) {
      alert('User not found. Please log in again.');
      return;
    }

    // Validate full name
    if (!profileForm.full_name || profileForm.full_name.trim() === '') {
      alert('Please enter your full name');
      return;
    }

    try {
      let avatarUrl = profileForm.avatar_url;

      // Upload new image if selected
      if (avatarFile) {
        console.log('Uploading avatar image...');
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          setProfileForm({ ...profileForm, avatar_url: uploadedUrl });
          console.log('Avatar uploaded, URL:', uploadedUrl);
        } else {
          console.error('Avatar upload failed, aborting profile save');
          alert('Failed to upload image. Profile not saved.');
          return; // Upload failed, don't save profile
        }
      }

      // Update profile in database
      const { error, data } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          full_name: profileForm.full_name.trim(),
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        // Check for specific RLS policy errors
        if (error.message.includes('row-level security') || error.message.includes('policy')) {
          throw new Error('Permission denied. Please ensure you are logged in and have permission to update your profile.');
        } else {
          throw error;
        }
      }

      // Update local state
      const updatedProfile = data || { ...profile, ...profileForm, avatar_url: avatarUrl };
      setProfile(updatedProfile);
      setAvatarPreview(avatarUrl || null);
      setIsEditingProfile(false);
      setAvatarFile(null);
      
      // Update user object for Header component with new avatar
      if (user) {
        const updatedUser = {
          ...user,
          name: profileForm.full_name.trim(),
          avatar: avatarUrl || undefined,
        };
        setUser(updatedUser);
        
        // Update cache with new profile data
        if (authUser) {
          cacheUserProfile(authUser.id, {
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar,
            coursesCompleted: updatedUser.coursesCompleted,
            coursesInProgress: updatedUser.coursesInProgress,
          });
        }
      }
      
      console.log('Profile saved successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      const errorMessage = error.message || 'Failed to save profile. Please try again.';
      alert(errorMessage);
    }
  };

  const handleSavePreferences = async () => {
    if (!authUser) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: authUser.id,
          ...preferencesForm,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setPreferences({ ...preferences, ...preferencesForm });
      setIsEditingPreferences(false);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences: ' + error.message);
    }
  };

  // Generate calendar grid (last 12 months, showing weeks)
  const calendarMonths = useMemo(() => {
    const months: { month: string; weeks: UserActivity[][] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create activity map for quick lookup
    const activityMap = new Map<string, UserActivity>();
    activityData.forEach(activity => {
      activityMap.set(activity.date, activity);
    });
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      
      // Get first day of month and last day
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      // Get first Monday of the week containing the first day
      const startDate = new Date(firstDay);
      const dayOfWeek = startDate.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(startDate.getDate() - daysToSubtract);
      
      // Generate weeks (4-5 weeks per month)
      const weeks: UserActivity[][] = [];
      let currentDate = new Date(startDate);
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // Last Sunday of the month
      
      while (currentDate <= endDate) {
        const week: UserActivity[] = [];
        for (let d = 0; d < 7; d++) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const activity = activityMap.get(dateStr) || { date: dateStr, count: 0, level: 0 };
          week.push(activity);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        weeks.push(week);
      }
      
      months.push({ month: monthName, weeks });
    }
    
    return months;
  }, [activityData]);

  if (loading) {
    return (
      <>
        <Header variant="app" user={user} headerData={headerData} isLoading={isLoadingUser} />
        <main className={styles.main}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading your profile...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header variant="app" user={user} headerData={headerData} isLoading={isLoadingUser} />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroIcon}>
              <User size={32} />
            </div>
            <h1>My Profile</h1>
            <p>Manage your account settings and track your learning progress</p>
          </div>
        </section>

        <div className={styles.container}>
          {/* Profile Information Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Profile Information</h2>
              {!isEditingProfile ? (
                <button
                  className={styles.editBtn}
                  onClick={() => {
                    setIsEditingProfile(true);
                    // Ensure preview is set to current avatar when starting to edit
                    setAvatarPreview(profile?.avatar_url || null);
                    setAvatarFile(null);
                  }}
                >
                  <Edit2 size={18} />
                  Edit
                </button>
              ) : (
                <div className={styles.editActions}>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSaveProfile}
                    disabled={uploading}
                  >
                    <Save size={18} />
                    {uploading ? 'Uploading...' : 'Save'}
                  </button>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileForm({
                        full_name: profile?.full_name || '',
                        avatar_url: profile?.avatar_url || '',
                      });
                      // Reset preview to original avatar or null
                      setAvatarPreview(profile?.avatar_url || null);
                      setAvatarFile(null);
                      setUploading(false);
                    }}
                  >
                    <X size={18} />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className={styles.profileCard}>
              <div className={styles.avatarSection}>
                <div className={styles.avatarLarge}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={profileForm.full_name || 'Profile'} />
                  ) : (
                    <User size={48} />
                  )}
                </div>
                {isEditingProfile && (
                  <div className={styles.avatarUpload}>
                    <label htmlFor="avatar-upload" className={styles.uploadLabel}>
                      <Upload size={18} />
                      {uploading ? 'Uploading...' : 'Upload Image'}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className={styles.fileInput}
                      disabled={uploading}
                    />
                    {avatarFile && (
                      <p className={styles.fileName}>
                        {avatarFile.name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.profileFields}>
                <div className={styles.field}>
                  <label>Full Name</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileForm.full_name}
                      onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      className={styles.input}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p>{profile?.full_name || 'Not set'}</p>
                  )}
                </div>

                <div className={styles.field}>
                  <label>Email</label>
                  <p>{user?.email || 'Not available'}</p>
                </div>

                <div className={styles.field}>
                  <label>Member Since</label>
                  <p>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'N/A'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Activity Calendar Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Learning Activity</h2>
              <div className={styles.legend}>
                <span>Less</span>
                <div className={styles.legendColors}>
                  <div className={`${styles.legendColor} ${styles.level0}`}></div>
                  <div className={`${styles.legendColor} ${styles.level1}`}></div>
                  <div className={`${styles.legendColor} ${styles.level2}`}></div>
                  <div className={`${styles.legendColor} ${styles.level3}`}></div>
                  <div className={`${styles.legendColor} ${styles.level4}`}></div>
                </div>
                <span>More</span>
              </div>
            </div>

            <div className={styles.activityCard}>
              <div className={styles.calendarGrid}>
                {calendarMonths.map((monthData, monthIdx) => (
                  <div key={monthIdx} className={styles.monthColumn}>
                    <div className={styles.monthLabel}>{monthData.month}</div>
                    <div className={styles.weeksContainer}>
                      {monthData.weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className={styles.week}>
                          {week.map((day, dayIdx) => {
                            const date = new Date(day.date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            date.setHours(0, 0, 0, 0);
                            const isToday = date.getTime() === today.getTime();
                            const isFuture = date > today;
                            
                            return (
                              <div
                                key={dayIdx}
                                className={`${styles.day} ${isFuture ? styles.future : styles[`level${day.level}`]} ${isToday ? styles.today : ''}`}
                                title={isFuture ? 'Future' : `${day.date}: ${day.count} lesson${day.count !== 1 ? 's' : ''}`}
                              >
                                {day.count > 0 && !isFuture && (
                                  <span className={styles.dayTooltip}>{day.count}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Activity Stats Section */}
          <section className={styles.statsSection}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>
                  <BookOpen size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3>{activityStats.totalLessons}</h3>
                  <p>Lessons Completed</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.hoursIcon}`}>
                  <Clock size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3>{activityStats.totalHours}</h3>
                  <p>Hours Learned</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.coursesIcon}`}>
                  <Award size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3>{activityStats.totalCompletedCourses}</h3>
                  <p>Courses Completed</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.streakIcon}`}>
                  <Sparkles size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3>{activityStats.currentStreak}</h3>
                  <p>Day Streak</p>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.weekIcon}`}>
                  <Activity size={24} />
                </div>
                <div className={styles.statContent}>
                  <h3>{activityStats.thisWeekActivity}</h3>
                  <p>This Week</p>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Learning Preferences</h2>
              {!isEditingPreferences ? (
                <button
                  className={styles.editBtn}
                  onClick={() => setIsEditingPreferences(true)}
                >
                  <Edit2 size={18} />
                  Edit
                </button>
              ) : (
                <div className={styles.editActions}>
                  <button
                    className={styles.saveBtn}
                    onClick={handleSavePreferences}
                  >
                    <Save size={18} />
                    Save
                  </button>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => {
                      setIsEditingPreferences(false);
                      setPreferencesForm({
                        goal: preferences?.goal || '',
                        role: preferences?.role || '',
                        education: preferences?.education || '',
                        topics: preferences?.topics || [],
                        schedule: preferences?.schedule || '',
                        daily_goal_minutes: preferences?.daily_goal_minutes || 0,
                      });
                    }}
                  >
                    <X size={18} />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className={styles.preferencesCard}>
              <div className={styles.preferencesGrid}>
                <div className={styles.preferenceField}>
                  <div className={styles.preferenceIcon}>
                    <Target size={20} />
                  </div>
                  <div className={styles.preferenceContent}>
                    <label>Learning Goal</label>
                    {isEditingPreferences ? (
                      <select
                        value={preferencesForm.goal}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, goal: e.target.value })}
                        className={styles.select}
                      >
                        <option value="">Select goal</option>
                        <option value="start-my-career">Start My Career</option>
                        <option value="change-my-career">Change My Career</option>
                        <option value="grow-in-my-role">Grow in My Role</option>
                        <option value="explore-for-fun">Explore for Fun</option>
                      </select>
                    ) : (
                      <p>{preferences?.goal ? preferences.goal.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div className={styles.preferenceField}>
                  <div className={styles.preferenceIcon}>
                    <Briefcase size={20} />
                  </div>
                  <div className={styles.preferenceContent}>
                    <label>Current Role</label>
                    {isEditingPreferences ? (
                      <select
                        value={preferencesForm.role}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, role: e.target.value })}
                        className={styles.select}
                      >
                        <option value="">Select role</option>
                        <option value="software-engineer">Software Engineer</option>
                        <option value="data-scientist">Data Scientist</option>
                        <option value="machine-learning-engineer">Machine Learning Engineer</option>
                        <option value="ux-designer">UX Designer</option>
                        <option value="product-manager">Product Manager</option>
                      </select>
                    ) : (
                      <p>{preferences?.role ? preferences.role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div className={styles.preferenceField}>
                  <div className={styles.preferenceIcon}>
                    <GraduationCap size={20} />
                  </div>
                  <div className={styles.preferenceContent}>
                    <label>Education</label>
                    {isEditingPreferences ? (
                      <select
                        value={preferencesForm.education}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, education: e.target.value })}
                        className={styles.select}
                      >
                        <option value="">Select education</option>
                        <option value="high-school">High School</option>
                        <option value="bachelors-degree">Bachelor's Degree</option>
                        <option value="masters-degree">Master's Degree</option>
                        <option value="phd">PhD</option>
                      </select>
                    ) : (
                      <p>{preferences?.education ? preferences.education.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div className={styles.preferenceField}>
                  <div className={styles.preferenceIcon}>
                    <Clock size={20} />
                  </div>
                  <div className={styles.preferenceContent}>
                    <label>Daily Goal</label>
                    {isEditingPreferences ? (
                      <input
                        type="number"
                        value={preferencesForm.daily_goal_minutes}
                        onChange={(e) => setPreferencesForm({ ...preferencesForm, daily_goal_minutes: parseInt(e.target.value) || 0 })}
                        className={styles.input}
                        placeholder="Minutes per day"
                        min="0"
                      />
                    ) : (
                      <p>{preferences?.daily_goal_minutes ? `${preferences.daily_goal_minutes} minutes/day` : 'Not set'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

