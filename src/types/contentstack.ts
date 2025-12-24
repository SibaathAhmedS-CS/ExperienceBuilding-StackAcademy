// Type definitions for Contentstack content types

export interface Asset {
  uid: string;
  url: string;
  title: string;
  filename: string;
  content_type?: string;
}

export interface Link {
  title: string;
  href: string;
}

// Color Picker Extension value structure
export interface ColorPickerValue {
  hex: string;
  rgb?: { r: number; g: number; b: number; a: number };
  hsl?: { h: number; s: number; l: number; a: number };
  hsv?: { h: number; s: number; v: number; a: number };
}

// ============================================
// CMS Content Types (Contentstack Integration)
// ============================================

// Icon Content Type (referenced by Header, Footer, Features, Categories, etc.)
export interface IconEntry {
  uid: string;
  title: string;
  icon_name?: string;    // e.g., "book-open" - Lucide icon name
  icon_title?: string;   // e.g., "StackAcademy" - Text to display next to icon
  description?: string;  // Description text for features, categories, etc.
}

// Category Entry (categories_block) - Used for category sections with taxonomy
export interface CategoryEntry {
  uid: string;
  title: string;                    // Category name (e.g., "Development")
  taxonomies?: {                    // Linked taxonomy term
    taxonomy_uid: string;           // e.g., "course_categories"
    term_uid: string;               // e.g., "development"
  }[];
  category_icon?: string;           // Icon name (e.g., "code")
}

// Author Content Type (referenced by Testimonial)
export interface AuthorEntry {
  uid: string;
  title: string;          // Full Name
  url?: string;           // Author page URL
  picture?: Asset;        // Legacy profile picture field
  profile_image?: Asset;  // Profile picture (file/asset field)
  profile_image_link?: Link;  // Profile picture URL (link field - alternative)
  bio?: string;           // Short biography
  experience?: number;    // Years of experience
  social_links?: {
    github_link?: Link;
    x_link?: Link;
    instagram_link?: Link;
    portfolio_link?: Link;
  };
}

// Banner Content Type - Updated with color picker
export interface BannerEntry {
  uid: string;
  title: string;
  label?: string;
  description?: string;
  banner_image?: Asset;
  button?: Link;
  banner_color?: ColorPickerValue;       // Background color picker
  banner_text_color?: ColorPickerValue;  // Text color picker
}

// Hero Banner Content Type - For landing page hero section
// Note: Field naming in CMS has nested groups (stats_icon, floating_icon)
export interface HeroBlockEntry {
  uid: string;
  title?: string;
  badge_text?: string;
  badge_icon?: string;
  headline?: string;
  highlight_text?: string;
  subtitle?: string;
  primary_cta?: Link;
  secondary_cta?: Link;
  hero_image?: Asset;  // Note: field is hero_image, not image
  // Stats have nested stats_icon group
  stats?: {
    stats_icon: {
      icon: string;   // NOTE: In the CMS entry, icon contains the value (e.g., "100+")
      label: string;  // Label (e.g., "Courses")
      value: string;  // NOTE: In the CMS entry, value contains the icon name (e.g., "book-open")
    };
    _metadata?: { uid: string };
  }[];
  // Floating cards have nested floating_icon group
  floating_cards?: {
    floating_icon: {
      icon: string;   // Icon name (e.g., "trending-up")
      label: string;  // Label (e.g., "Success Rate")
      value: string;  // Value (e.g., "95%")
    };
    _metadata?: { uid: string };
  }[];
}

// Testimonial Content Type - Updated with rating extension and author reference
export interface TestimonialEntry {
  uid: string;
  title: string;
  rating?: number | { value: number } | any; // Custom extension field
  review?: string;
  author?: AuthorEntry | AuthorEntry[];
}

// Global Field: Title and Description
export interface TitleAndDescription {
  title?: string;
  description?: string;
}

// ============================================
// Page Modular Blocks
// ============================================

// Hero Block (references hero_block content type)
export interface HeroSectionBlock {
  hero_block: {
    hero_banner?: HeroBlockEntry | HeroBlockEntry[];
  };
}

// Carousel Block
export interface CarouselBlock {
  carousel_block: {
    interval?: number;
    autoplay?: boolean;
    banner?: BannerEntry | BannerEntry[];
  };
}

// Category Block - Updated to use CategoryEntry references
export interface CategoryBlock {
  category_block: {
    title_and_description?: TitleAndDescription;
    category?: CategoryEntry | CategoryEntry[];  // References to categories_block entries
    icon?: IconEntry | IconEntry[];              // Legacy support
  };
}

// Feature Block
export interface FeatureBlock {
  feature_block: {
    title_and_description?: TitleAndDescription;
    features?: IconEntry | IconEntry[];
  };
}

// Workflow Block (How it Works)
export interface WorkflowBlock {
  workflow_block: {
    title_and_description?: TitleAndDescription;
    stage?: IconEntry | IconEntry[];
  };
}

// Partners Block
export interface PartnersBlock {
  partners_block: {
    label?: string;
    partner?: string[];
  };
}

// Testimonial Block
export interface TestimonialBlock {
  testimonial_block: {
    title_and_description?: TitleAndDescription;
    testimonial?: TestimonialEntry | TestimonialEntry[];
  };
}

// Card Block (for course sections) - Updated with CTA button
export interface CardBlock {
  card_block: {
    title_and_description?: TitleAndDescription;
    cta_button?: Link;  // Optional CTA button link
  };
}

// Search Block (for hero sections with search bar)
export interface SearchBlock {
  search_block: {
    search_title?: TitleAndDescription;
    placeholder?: string;
  };
}

// CTA Block (for call-to-action sections)
export interface CTABlock {
  cta_block: {
    cta_title?: TitleAndDescription;
    cta_button?: Link;
  };
}

// Union type for all section blocks
export type PageSection = 
  | HeroSectionBlock
  | CarouselBlock 
  | CategoryBlock 
  | FeatureBlock 
  | WorkflowBlock 
  | PartnersBlock 
  | TestimonialBlock 
  | CardBlock
  | SearchBlock
  | CTABlock;

// Type guards for section blocks
export function isHeroSectionBlock(section: PageSection): section is HeroSectionBlock {
  return 'hero_block' in section;
}

export function isCarouselBlock(section: PageSection): section is CarouselBlock {
  return 'carousel_block' in section;
}

export function isCategoryBlock(section: PageSection): section is CategoryBlock {
  return 'category_block' in section;
}

export function isFeatureBlock(section: PageSection): section is FeatureBlock {
  return 'feature_block' in section;
}

export function isWorkflowBlock(section: PageSection): section is WorkflowBlock {
  return 'workflow_block' in section;
}

export function isPartnersBlock(section: PageSection): section is PartnersBlock {
  return 'partners_block' in section;
}

export function isTestimonialBlock(section: PageSection): section is TestimonialBlock {
  return 'testimonial_block' in section;
}

export function isCardBlock(section: PageSection): section is CardBlock {
  return 'card_block' in section;
}

export function isSearchBlock(section: PageSection): section is SearchBlock {
  return 'search_block' in section;
}

export function isCTABlock(section: PageSection): section is CTABlock {
  return 'cta_block' in section;
}

// Page Content Type (modular_section) - Main page builder
export interface PageEntry {
  uid: string;
  title: string;
  url?: string;
  header?: HeaderEntry | HeaderEntry[];
  section?: PageSection[];
}

// ============================================
// Header Content Types
// ============================================

// Header Content Type - Matches Contentstack schema
export interface HeaderEntry {
  uid: string;
  title: string;
  icon: IconEntry;  // Reference to icon content type
  navigation: {
    link: Link[];
  };
  search_visibility: boolean;
  components: HeaderComponent[];
}

// Header Component types (modular blocks)
export type HeaderComponent = AuthButtonsBlock | ProfileBlock;

export interface AuthButtonsBlock {
  auth_buttons: {
    sign_up: Link;
    log_in: Link;
  };
}

export interface ProfileBlock {
  profile_icon: {
    icon: string;
    dropdown_items: ProfileDropdownItem[];
  };
}

export interface ProfileDropdownItem {
  icon: string;
  item: Link;
}

// Helper type guards for Header components
export function isAuthButtonsBlock(component: HeaderComponent): component is AuthButtonsBlock {
  return 'auth_buttons' in component;
}

export function isProfileBlock(component: HeaderComponent): component is ProfileBlock {
  return 'profile_icon' in component;
}

// ============================================
// Footer & Newsletter Content Types
// ============================================

// Footer Content Type - Matches Contentstack schema
export interface FooterEntry {
  uid: string;
  title: string;
  icon: IconEntry;  // Reference to icon content type (logo)
  brand_desciption: string;  // Note: typo in Contentstack field name
  contact_info: {
    email: string;
    phone_no: string;
    address: string;
  };
  social_links: Link[];  // Array of links (title + href)
  copyright_text: string;
}

// Newsletter Content Type - Matches Contentstack schema
export interface NewsletterEntry {
  uid: string;
  title: string;
  icon: IconEntry;  // Reference to icon content type
  heading: string;
  description: string;
  placeholder_text: string;
  button_text: string;
}

// ============================================
// FAQ Content Types
// ============================================

// FAQ Question Content Type - Matches Contentstack schema
export interface FAQQuestionEntry {
  uid: string;
  title: string;
  questions: {
    question: string;
    answer: string;
  }[];
}

// FAQ Section Content Type - Matches Contentstack schema
export interface FAQEntry {
  uid: string;
  title: string;
  icon: IconEntry;  // Reference to icon content type
  section_title: string;
  section_subtitle: string;
  faq_question: FAQQuestionEntry | FAQQuestionEntry[];  // Reference (can be single or array)
}

// ============================================
// Legacy Types (for backwards compatibility)
// ============================================

// Banner/Carousel Item (legacy)
export interface Banner {
  uid: string;
  title: string;
  description: string;
  image: Asset;
  cta_button: {
    label: string;
    url: string;
  };
  background_color?: string;
}

// Category Content Type
export interface Category {
  uid: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  image: Asset;
  course_count?: number;
}

// Instructor Content Type
export interface Instructor {
  uid: string;
  name: string;
  title: string;
  bio: string;
  profile_image: Asset;
  social_links?: {
    platform: string;
    url: string;
  }[];
}

// ============================================
// Course Learning Content Types (CMS)
// ============================================

// Resource types for lessons
export interface FileResource {
  file_resource: {
    resource_label: string;
    resource_file?: Asset;
  };
}

export interface LinkResource {
  link_resource: {
    resource_label: string;
    resource_link?: Link;
  };
}

export type LessonResource = FileResource | LinkResource;

// Lesson Entry (from CMS)
export interface LessonEntry {
  uid: string;
  title: string;
  slug?: string;
  is_preview?: boolean;
  order?: number;
  duration?: string;
  video_url?: Link;
  lesson_content?: string;
  resources?: LessonResource[];
}

// Module Entry (from CMS)
export interface ModuleEntry {
  uid: string;
  title: string;
  order?: number;
  duration?: string;
  total_lessons?: number;
  lessons?: LessonEntry | LessonEntry[];
}

// Course Entry (from CMS)
export interface CourseEntry {
  uid: string;
  title: string;
  slug: string;
  course_image?: Asset;
  course_image_link?: Link; // URL-based thumbnail
  taxonomies?: {
    taxonomy_uid: string;
    term_uid: string;
  }[];
  short_text?: string;
  author?: AuthorEntry | AuthorEntry[];
  duration?: number;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
  total_duration?: number;
  total_modules?: number;
  languages_supported?: string[];
  about_the_course?: string;
  learning_outcomes?: {
    point?: string[];
  };
  requirements?: string;
  modules?: ModuleEntry | ModuleEntry[];
  updated_at?: string;
}

// Helper type guards for lesson resources
export function isFileResource(resource: LessonResource): resource is FileResource {
  return 'file_resource' in resource;
}

export function isLinkResource(resource: LessonResource): resource is LinkResource {
  return 'link_resource' in resource;
}

// Module Content Type (Legacy)
export interface Module {
  uid: string;
  title: string;
  description: string;
  duration: string;
  video_url: string;
  video_thumbnail: Asset;
  content: string; // Rich text content
  resources?: {
    title: string;
    file: Asset;
  }[];
  order: number;
  is_preview?: boolean;
}

// Course Content Type
export interface Course {
  uid: string;
  title: string;
  slug: string;
  short_description: string;
  description: string; // Rich text
  thumbnail: Asset;
  hero_image: Asset;
  instructor: Instructor[];
  category: Category[];
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  rating: number;
  reviews_count: number;
  students_enrolled: number;
  outcomes: string[];
  requirements: string[];
  modules: Module[];
  is_featured?: boolean;
  is_popular?: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// Review Content Type
export interface Review {
  uid: string;
  user_name: string;
  user_avatar?: Asset;
  rating: number;
  comment: string;
  course: Course[];
  created_at: string;
}

// Legacy FAQ type
export interface FAQ {
  uid: string;
  question: string;
  answer: string;
  category?: string;
  order: number;
}

// Legacy Testimonial type
export interface Testimonial {
  uid: string;
  name: string;
  role: string;
  company: string;
  avatar: Asset;
  quote: string;
  rating: number;
}

// Landing Page Content Type (legacy)
export interface LandingPage {
  uid: string;
  title: string;
  hero: {
    headline: string;
    subheadline: string;
    description: string;
    image: Asset;
    primary_cta: Link;
    secondary_cta: Link;
    stats: {
      value: string;
      label: string;
    }[];
  };
  features: {
    title: string;
    description: string;
    icon: string;
  }[];
  testimonials: Testimonial[];
  partners: {
    name: string;
    logo: Asset;
  }[];
  faqs: FAQ[];
}

// Home Page Content Type (legacy)
export interface HomePage {
  uid: string;
  title: string;
  banners: Banner[];
  featured_categories: Category[];
  top_courses: Course[];
  recommended_courses: Course[];
  faqs: FAQ[];
}

// User Profile (Client-side state)
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  enrolled_courses: string[];
  completed_courses: string[];
  in_progress_courses: {
    course_uid: string;
    progress: number;
    last_module_uid: string;
  }[];
}

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize array references (handles single object or array)
 */
export function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Extract rating value from Contentstack rating extension
 */
export function extractRating(rating: number | { value: number } | any): number {
  if (typeof rating === 'number') return rating;
  if (rating && typeof rating === 'object' && 'value' in rating) return rating.value;
  return 5; // default
}

/**
 * Extract color from Contentstack color picker extension
 */
export function extractColor(color: ColorPickerValue | undefined, fallback: string = '#3b82f6'): string {
  if (!color) return fallback;
  return color.hex || fallback;
}

/**
 * Extract role/company from author bio
 * Format expected: "Role at Company. Additional info..."
 */
export function extractAuthorRole(bio?: string): { role: string; company: string } {
  if (!bio) return { role: 'Student', company: '' };
  
  // Try to extract "Role at Company" from beginning of bio
  const match = bio.match(/^([^.]+?)(?:\s+at\s+|\s+@\s+)([^.]+)/i);
  if (match) {
    return { role: match[1].trim(), company: match[2].trim() };
  }
  
  // Fallback: use first sentence or first few words
  const firstSentence = bio.split('.')[0];
  if (firstSentence.length < 50) {
    return { role: firstSentence.trim(), company: '' };
  }
  
  return { role: 'Student', company: '' };
}

/**
 * Extract stats from Hero Banner - handles the swapped icon/value fields
 * In the CMS, icon contains the display value and value contains the icon name
 */
export function extractHeroStats(stats: HeroBlockEntry['stats']): { value: string; label: string; iconName: string }[] {
  if (!stats) return [];
  
  return stats.map(stat => ({
    value: stat.stats_icon.icon,      // Display value (e.g., "100+")
    label: stat.stats_icon.label,     // Label (e.g., "Courses")
    iconName: stat.stats_icon.value,  // Icon name (e.g., "book-open")
  }));
}

/**
 * Extract floating cards from Hero Banner
 */
export function extractFloatingCards(cards: HeroBlockEntry['floating_cards']): { icon: string; value: string; label: string }[] {
  if (!cards) return [];
  
  return cards.map(card => ({
    icon: card.floating_icon.icon,
    value: card.floating_icon.value,
    label: card.floating_icon.label,
  }));
}
