/**
 * Sync Courses from Contentstack to Algolia
 * 
 * This script fetches all courses from Contentstack for each locale
 * and syncs them to corresponding Algolia indices.
 * 
 * Usage: npm run sync-algolia
 * 
 * Prerequisites:
 * - Set ALGOLIA_ADMIN_API_KEY in .env.local
 * - Set Contentstack credentials in .env.local
 */

// IMPORTANT: Load environment variables FIRST, before any other imports
// This ensures Contentstack Stack initialization reads the correct env vars
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local file - must happen before importing contentstack
const envPath = resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`⚠️  Warning: Could not load .env.local from ${envPath}`);
  console.warn(`   Error: ${result.error.message}`);
  console.warn(`   Trying to continue with existing environment variables...\n`);
} else {
  console.log(`✅ Loaded environment variables from .env.local\n`);
}

// Now import modules that depend on environment variables
import { getAdminClient, getIndexName, SUPPORTED_LOCALES, AlgoliaCourseRecord } from '../src/lib/algolia';
import { getAllCourses, createFreshStack } from '../src/lib/contentstack';
import { CourseEntry } from '../src/types/contentstack';

async function syncCoursesToAlgolia() {
  // Verify Contentstack credentials
  const contentstackApiKey = process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY || process.env.CONTENTSTACK_API_KEY;
  const contentstackDeliveryToken = process.env.NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN || process.env.CONTENTSTACK_DELIVERY_TOKEN;
  const contentstackEnvironment = process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT || process.env.CONTENTSTACK_ENVIRONMENT;
  const contentstackRegion = process.env.CONTENTSTACK_REGION || 'us';
  
  console.log('🔍 Verifying credentials...');
  console.log(`   API Key: ${contentstackApiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Delivery Token: ${contentstackDeliveryToken ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Environment: ${contentstackEnvironment || 'dev'}`);
  console.log(`   Region: ${contentstackRegion}\n`);
  
  if (!contentstackApiKey || !contentstackDeliveryToken) {
    console.error('❌ Contentstack credentials not found.');
    console.error('   Please check that the following are set in .env.local:');
    console.error('   - CONTENTSTACK_API_KEY or NEXT_PUBLIC_CONTENTSTACK_API_KEY');
    console.error('   - CONTENTSTACK_DELIVERY_TOKEN or NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN');
    console.error(`   - Current working directory: ${process.cwd()}`);
    console.error(`   - Looking for .env.local at: ${resolve(process.cwd(), '.env.local')}`);
    process.exit(1);
  }

  // Verify Algolia credentials
  const adminClient = getAdminClient();
  
  if (!adminClient) {
    console.error('❌ Algolia admin client not initialized.');
    console.error('   Please check that ALGOLIA_ADMIN_API_KEY is set in .env.local');
    console.error('   Also ensure NEXT_PUBLIC_ALGOLIA_APP_ID is set.');
    process.exit(1);
  }

  console.log('🚀 Starting Algolia sync for courses...');
  console.log(`📚 Contentstack Environment: ${contentstackEnvironment || 'dev'}`);
  console.log(`🔍 Algolia App ID: ${process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ? '✅ Set' : '❌ Missing'}\n`);

  // Create a fresh Stack instance with current environment variables
  // This ensures the Stack is initialized AFTER env vars are loaded
  const freshStack = createFreshStack();
  console.log('✅ Created fresh Contentstack Stack instance\n');

  for (const locale of SUPPORTED_LOCALES) {
    console.log(`📦 Syncing courses for locale: ${locale}`);
    console.log(`   🔄 Fetching courses from Contentstack...`);
    
    try {
      // Fetch courses from Contentstack for this locale using fresh Stack
      // Skip author resolution to avoid errors - we'll use author data from the reference
      const courses = await getAllCourses(locale, freshStack, true);
      console.log(`   ✅ Found ${courses.length} courses in Contentstack`);

      if (courses.length === 0) {
        console.log(`   ⚠️  No courses found for ${locale}, skipping...\n`);
        continue;
      }

      // Transform courses to Algolia records
      const records: AlgoliaCourseRecord[] = courses.map((course: CourseEntry) => {
        const author = Array.isArray(course.author) ? course.author[0] : course.author;
        
        return {
          objectID: course.uid,
          title: course.title || '',
          slug: course.slug || course.uid,
          description: course.about_the_course || course.short_text || '',
          short_text: course.short_text || '',
          instructor_name: author?.title || '',
          difficulty_level: course.difficulty_level || '',
          category: course.taxonomies?.[0]?.term_uid || '',
          duration: course.total_duration || course.duration || 0,
          locale: locale,
        };
      });

      // Get the index for this locale
      const indexName = getIndexName(locale);
      console.log(`   🔄 Configuring Algolia index: ${indexName}...`);

      // Configure index settings (v5 API - methods take index name as first parameter)
      await adminClient.setSettings({
        indexName: indexName,
        indexSettings: {
          searchableAttributes: [
            'title',
            'description',
            'short_text',
            'instructor_name',
            'category',
          ],
          attributesForFaceting: [
            'filterOnly(difficulty_level)',
            'filterOnly(category)',
            'filterOnly(locale)',
          ],
          customRanking: ['desc(duration)'], // Optional: rank by duration
          highlightPreTag: '<mark>',
          highlightPostTag: '</mark>',
        },
      });

      // Save objects to Algolia (v5 API)
      console.log(`   🔄 Uploading ${records.length} courses to Algolia...`);
      await adminClient.saveObjects({
        indexName: indexName,
        objects: records as unknown as Record<string, unknown>[],
      });
      console.log(`   ✅ Successfully synced ${records.length} courses to index: ${indexName}\n`);

    } catch (error) {
      console.error(`   ❌ Error syncing courses for ${locale}:`, error);
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
      }
      console.log('');
    }
  }

  console.log('✨ Sync complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Go to Algolia Dashboard to verify indices');
  console.log('   2. Test search in your application');
  console.log('   3. Run this script again when courses are updated\n');
}

// Run the sync
syncCoursesToAlgolia().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

