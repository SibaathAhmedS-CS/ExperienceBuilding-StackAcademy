# StackAcademy - E-Learning Platform

A modern, professional e-learning platform built with Next.js 14 and designed to integrate seamlessly with Contentstack CMS.

![StackAcademy](https://via.placeholder.com/1200x630?text=StackAcademy+E-Learning+Platform)

## 🚀 Features

### Pages
- **Landing Page** - Beautiful hero section, features, popular courses, testimonials, FAQs
- **Login/Signup** - Secure authentication with social login options
- **Home Dashboard** - Promotional carousel, categories, top courses, recommendations
- **Course Detail** - Hero banner, tabbed navigation (About, Outcomes, Modules, Reviews)
- **Module Player** - Video player, lesson content, resources, course progress tracking

### UI/UX
- 🎨 Modern, clean, and professional design
- 📱 Fully responsive across all devices
- ✨ Smooth animations and micro-interactions
- 🌙 Consistent design system with CSS variables
- ♿ Accessible components

### Technical
- ⚡ Next.js 14 App Router
- 🔤 TypeScript for type safety
- 🎯 Contentstack SDK integration ready
- 🧩 Reusable component architecture
- 📦 Modular CSS with CSS Modules

## 📁 Project Structure

```
stack-academy/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Auth pages (login, signup)
│   │   ├── (main)/           # Main app pages
│   │   │   ├── home/         # Dashboard
│   │   │   ├── course/[slug]/# Course detail
│   │   │   └── module/[id]/  # Video player
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   ├── components/
│   │   ├── Header/           # Navigation header
│   │   ├── Footer/           # Site footer
│   │   ├── Carousel/         # Promotional slider
│   │   ├── CourseCard/       # Course card component
│   │   ├── CategoryCard/     # Category display
│   │   ├── FAQ/              # Accordion FAQ
│   │   └── VideoPlayer/      # Custom video player
│   ├── lib/
│   │   └── contentstack.ts   # Contentstack SDK
│   └── types/
│       └── contentstack.ts   # TypeScript interfaces
├── public/
│   └── images/
├── package.json
└── README.md
```

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Contentstack account (for CMS integration)

### Installation

1. **Clone the repository**
   ```bash
   cd stack-academy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your Contentstack credentials:
   ```env
   CONTENTSTACK_API_KEY=your_api_key
   CONTENTSTACK_DELIVERY_TOKEN=your_delivery_token
   CONTENTSTACK_ENVIRONMENT=development
   CONTENTSTACK_BRANCH=main
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📚 Contentstack Integration

### Required Content Types

Create these content types in your Contentstack stack:

#### 1. Course
```
Fields:
- title (Single Line Text)
- slug (Single Line Text, Unique)
- short_description (Multi Line Text)
- description (Rich Text Editor)
- thumbnail (File - Image)
- hero_image (File - Image)
- instructor (Reference - Instructor)
- category (Reference - Category)
- level (Select: beginner, intermediate, advanced)
- duration (Single Line Text)
- rating (Number)
- reviews_count (Number)
- students_enrolled (Number)
- price (Number)
- discount_price (Number)
- outcomes (Group - Multiple)
- requirements (Group - Multiple)
- modules (Reference - Module, Multiple)
- is_featured (Boolean)
- is_popular (Boolean)
```

#### 2. Module
```
Fields:
- title (Single Line Text)
- description (Multi Line Text)
- duration (Single Line Text)
- video_url (Single Line Text)
- video_thumbnail (File - Image)
- content (Rich Text Editor)
- resources (Group - Multiple)
- order (Number)
- is_preview (Boolean)
```

#### 3. Category
```
Fields:
- title (Single Line Text)
- slug (Single Line Text, Unique)
- description (Multi Line Text)
- icon (Single Line Text)
- image (File - Image)
```

#### 4. Instructor
```
Fields:
- name (Single Line Text)
- title (Single Line Text)
- bio (Multi Line Text)
- profile_image (File - Image)
- courses_count (Number)
- students_count (Number)
- rating (Number)
```

#### 5. Banner
```
Fields:
- title (Single Line Text)
- description (Multi Line Text)
- image (File - Image)
- cta_label (Single Line Text)
- cta_url (Single Line Text)
- background_color (Single Line Text)
```

#### 6. FAQ
```
Fields:
- question (Single Line Text)
- answer (Multi Line Text)
- category (Single Line Text)
- order (Number)
```

### Fetching Data

Use the provided SDK helpers:

```typescript
import { getEntries, getEntry, CONTENT_TYPES } from '@/lib/contentstack';

// Fetch all courses
const courses = await getEntries(CONTENT_TYPES.COURSE, {
  referenceFields: ['instructor', 'category'],
  limit: 10,
});

// Fetch single course by slug
const course = await getEntryByUrl(CONTENT_TYPES.COURSE, '/machine-learning-python');
```

## 🎨 Customization

### Colors
Edit CSS variables in `src/app/globals.css`:

```css
:root {
  --primary-500: #3b82f6;  /* Main brand color */
  --accent-500: #f97316;   /* Accent color */
  /* ... */
}
```

### Fonts
The project uses:
- **Outfit** - Headings
- **Plus Jakarta Sans** - Body text

Update in `globals.css` to change fonts.

## 📱 Pages Overview

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Marketing landing page |
| Login | `/login` | User authentication |
| Signup | `/signup` | User registration |
| Home | `/home` | Logged-in dashboard |
| Course | `/course/[slug]` | Course details |
| Module | `/module/[id]` | Video lesson player |

## 🔧 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework |
| `react` | UI library |
| `contentstack` | CMS SDK |
| `lucide-react` | Icons |
| `framer-motion` | Animations |
| `react-player` | Video playback |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ using Next.js and Contentstack

