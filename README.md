# StackAcademy - E-Learning Platform

A modern e-learning platform built with Next.js 14, Contentstack CMS, Supabase authentication, and Algolia search.

## Features

### Pages
- **Landing Page** (`/`) - Hero section, features, popular courses, testimonials, FAQs
- **Authentication** (`/login`, `/signup`) - Supabase-based authentication
- **Onboarding** (`/onboarding`) - Multi-step user onboarding flow
- **Home Dashboard** (`/home`) - Personalized dashboard with carousel, categories, and course recommendations
- **Courses** (`/courses`) - Browse all courses with Algolia search and filtering
- **Course Detail** (`/course/[slug]`) - Course information, modules, reviews
- **Module Player** (`/module/[id]`) - Video player and lesson content
- **My Courses** (`/my-courses`) - User's enrolled courses
- **Profile** (`/profile`) - User profile management
- **Certificate** (`/certificate/[enrollmentId]`) - Course completion certificates

### Key Integrations
- **Contentstack CMS** - Content management and delivery
- **Supabase** - Authentication and user data
- **Algolia** - Course search functionality
- **Lytics** - User tracking and personalization
- **Contentstack Personalize** - Variant delivery based on user audience
- **Contentstack Live Preview** - Real-time content preview

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **CMS**: Contentstack
- **Auth**: Supabase
- **Search**: Algolia
- **Analytics**: Lytics

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Contentstack account
- Supabase project
- Algolia account (optional, for search)

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```env
   # Contentstack
   CONTENTSTACK_API_KEY=your_api_key
   CONTENTSTACK_DELIVERY_TOKEN=your_delivery_token
   CONTENTSTACK_ENVIRONMENT=development
   CONTENTSTACK_BRANCH=main
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Algolia (optional)
   NEXT_PUBLIC_ALGOLIA_APP_ID=your_algolia_app_id
   NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=your_search_key
   ALGOLIA_ADMIN_API_KEY=your_admin_key
   
   # Lytics (optional)
   NEXT_PUBLIC_LYTICS_ACCOUNT_ID=your_lytics_account_id
   
   # Contentstack Personalize (optional)
   NEXT_PUBLIC_CONTENTSTACK_PERSONALIZE_PROJECT_UID=your_project_uid
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Auth pages (login, signup, onboarding)
│   ├── (main)/            # Main app pages (home, courses, profile, etc.)
│   └── auth/              # Auth callback routes
├── components/            # React components
│   ├── Header/           # Navigation header
│   ├── Footer/           # Site footer
│   ├── Carousel/         # Promotional slider
│   ├── CourseCard/       # Course card component
│   ├── CategoryCard/     # Category display
│   ├── FAQ/              # Accordion FAQ
│   ├── VideoPlayer/      # Video player component
│   └── ...
├── hooks/                 # Custom React hooks
│   ├── useCourses.ts     # Course data fetching
│   ├── useAlgoliaSearch.ts # Algolia search
│   ├── useHeader.ts      # Header data
│   └── ...
├── lib/                   # Library configurations
│   ├── contentstack.ts   # Contentstack SDK helpers
│   └── algolia.ts        # Algolia client
├── services/             # Service integrations
│   ├── lytics.ts         # Lytics tracking
│   ├── personalize.ts    # Personalization
│   └── ...
├── types/                 # TypeScript type definitions
└── utils/                # Utility functions
```

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run sync-algolia # Sync courses to Algolia index
```

## Contentstack Content Types

The application uses these Contentstack content types:

- **Page** (`modular_section`) - Modular page content
- **Header** (`header`) - Navigation headers
- **Footer** (`footer`) - Site footer
- **Course** (`courses`) - Course content
- **Module** (`module`) - Course modules
- **Lesson** (`lesson`) - Individual lessons
- **Category** (`categories_block`) - Course categories
- **Banner** (`banner`) - Promotional banners
- **FAQ** (`faq`) - FAQ content
- **Testimonial** (`testimonial`) - Student testimonials
- **Author** (`author`) - Course authors/instructors
- **Onboarding** (`onboarding_block`) - Onboarding steps
- **Auth Branding** (`auth_branding`) - Login/signup page branding

## Key Features

- **Multi-language Support** - Content localization with fallback to default locale
- **Personalization** - User-based content variants via Contentstack Personalize
- **Search** - Full-text course search powered by Algolia
- **User Tracking** - Analytics and user behavior tracking via Lytics
- **Live Preview** - Real-time content preview in Contentstack
- **Responsive Design** - Mobile-first, fully responsive UI