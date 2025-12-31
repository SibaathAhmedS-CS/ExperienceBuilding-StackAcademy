/**
 * Send course completion webhook to Contentstack Automate
 * @param data - Webhook payload data
 * @returns Promise<boolean> - Success status
 */
export async function sendCourseCompletionWebhook(data: {
  email: string;
  name: string;
  courseName: string;
  certificateUrl: string;
}): Promise<boolean> {
  const webhookUrl = process.env.NEXT_PUBLIC_CONTENTSTACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️ Contentstack webhook URL not configured. Skipping webhook call.');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        course_name: data.courseName,
        certificate_url: data.certificateUrl,
        completed_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error('❌ Webhook request failed:', response.status, response.statusText);
      return false;
    }

    console.log('✅ Course completion webhook sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending webhook:', error);
    return false;
  }
}

/**
 * Send course enrollment webhook to Contentstack Automate
 * @param data - Webhook payload data
 * @returns Promise<boolean> - Success status
 */
export async function sendCourseEnrollmentWebhook(data: {
  userName: string;
  userEmail: string;
  aboutCourse: string;
  courseTitle: string;
  courseDetailPageLink: string;
}): Promise<boolean> {
  const webhookUrl = process.env.NEXT_PUBLIC_CONTENTSTACK_ENROLLMENT_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️ Contentstack enrollment webhook URL not configured. Skipping webhook call.');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_name: data.userName,
        user_email: data.userEmail,
        about_course: data.aboutCourse,
        course_title: data.courseTitle,
        course_detail_page_link: data.courseDetailPageLink,
      }),
    });

    if (!response.ok) {
      console.error('❌ Enrollment webhook request failed:', response.status, response.statusText);
      return false;
    }

    console.log('✅ Course enrollment webhook sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending enrollment webhook:', error);
    return false;
  }
}

