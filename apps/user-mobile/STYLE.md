# Style Guide

This document explains the design system and styling conventions used in FinanceBro.

## Design Philosophy

- **Minimal & Clean**: Generous whitespace, no visual clutter
- **Content-First**: UI stays out of the way, focus on data
- **Subtle Interactions**: Light hover states, smooth transitions
- **Accessible**: Keyboard focus states, ARIA attributes, contrast ratios

---

## Color System

### Brand Colors (Sky Blue)

The primary brand color is sky blue, used for interactive elements and accents.

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--primary` | `oklch(0.59 0.14 242)` | `oklch(0.68 0.15 237)` | Buttons, links, accents |
| `--primary-foreground` | Off-white | Dark blue | Text on primary |

### Semantic Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Brand | `#2E90FA` | Primary actions, links |
| Error | `#F04438` | Destructive actions, errors |
| Warning | `#F79009` | Warnings, cautions |
| Success | `#17B26A` | Success states, confirmations |

### Gray Scale

11-tone gray scale from `gray-25` (lightest) to `gray-950` (darkest):

```
gray-25:  #FDFDFD  (backgrounds)
gray-50:  #FAFAFA
gray-100: #F5F5F5
gray-200: #E5E5E5  (borders)
gray-300: #D6D6D6
gray-400: #A3A3A3
gray-500: #737373  (muted text)
gray-600: #525252
gray-700: #424242  (secondary text)
gray-800: #292929
gray-900: #1A1A1A  (primary text)
gray-950: #0A0D12  (darkest)
```

### Text Colors

| Token | Color | Usage |
|-------|-------|-------|
| `text-primary` | gray-900 | Headings, important text |
| `text-secondary` | gray-700 | Body text |
| `text-tertiary` | gray-600 | Less important text |
| `text-muted` | gray-500 | Hints, placeholders |
| `text-disabled` | gray-400 | Disabled states |

---

## Typography

### Font Family

- **Body & Headings**: Inter (with system font fallback)
- **Monospace**: Roboto Mono, SFMono-Regular

### Size Scale

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px | 18px | Labels, captions |
| `text-sm` | 14px | 20px | Secondary text |
| `text-base` | 16px | 24px | Body text |
| `text-lg` | 18px | 28px | Subheadings |
| `text-xl` | 20px | 30px | Section titles |
| `display-xs` | 24px | 32px | Page subtitles |
| `display-sm` | 30px | 38px | Page titles |
| `display-md` | 36px | 44px | Hero text |
| `display-lg` | 48px | 60px | Large display |

### Font Weights

- `font-normal` (400): Body text
- `font-medium` (500): Buttons, labels
- `font-semibold` (600): Headings
- `font-bold` (700): Display text

---

## Spacing

Base unit: **4px** (Tailwind's default spacing scale)

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Tight spacing |
| `gap-2` | 8px | Default icon-text gap |
| `gap-4` | 16px | Component padding |
| `gap-6` | 24px | Card padding |
| `gap-8` | 32px | Section spacing |

### Common Patterns

```css
/* Card padding */
padding: 24px (p-6)

/* Button padding */
padding: 8px 10px (px-2.5 py-2)

/* Input padding */
padding: 8px 12px (px-3 py-2)

/* Page margins */
padding: 16px (p-4)
```

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Small elements |
| `rounded-md` | 6px | Inputs, buttons |
| `rounded-lg` | 8px | Cards |
| `rounded-xl` | 12px | Large cards |
| `rounded-2xl` | 16px | Modals |
| `rounded-full` | 9999px | Avatars, badges |

Base radius: `--radius: 10px`

---

## Shadows

| Level | Usage |
|-------|-------|
| `shadow-xs` | Cards, subtle elevation |
| `shadow-sm` | Dropdowns, popovers |
| `shadow-md` | Modals, dialogs |
| `shadow-lg` | Floating elements |

### Shadow Values

```css
--shadow-xs: 0px 1px 2px rgba(10, 13, 18, 0.05);
--shadow-sm: 0px 1px 3px rgba(10, 13, 18, 0.1),
             0px 1px 2px rgba(10, 13, 18, 0.1);
--shadow-md: 0px 4px 6px rgba(10, 13, 18, 0.1),
             0px 2px 4px rgba(10, 13, 18, 0.06);
```

---

## Icons

### Library

**Lucide React** - 500+ icons, consistent 24x24 viewbox

```tsx
import { Search, Plus, Trash, MoreHorizontal } from "lucide-react"
```

### Sizing

| Context | Class | Size |
|---------|-------|------|
| Default | `size-4` | 16px |
| Small | `size-3` | 12px |
| Large | `size-5` | 20px |
| Button icon | `size-4` | 16px |

### Common Icons

| Icon | Usage |
|------|-------|
| `Plus` | Add/create actions |
| `Trash` | Delete actions |
| `Search` | Search inputs |
| `MoreHorizontal` | Menu triggers |
| `ChevronDown` | Dropdowns |
| `ChevronRight` | Sidebar triggers |
| `Check` | Selected state |
| `X` | Close/dismiss |
| `Loader2` | Loading spinner |
| `ExternalLink` | External links |

### Icon + Text Pattern

```tsx
<Button>
  <Plus className="size-4" />
  Add Item
</Button>
```

Gap between icon and text: `gap-1.5` (6px)

---

## Emoji Usage

Emojis are used sparingly as visual accents, not as primary UI elements.

### Where to Use

| Context | Examples |
|---------|----------|
| Workspace labels | 💰 Finance, 🤝 Sales, 💬 Team |
| Status indicators | ✅ Success, ❌ Error, ⚠️ Warning |
| Message reactions | 👍 👎 ❤️ 🎉 🔥 |
| Feature highlights | 💡 Tips, 🔥 Hot, ✨ New |

### Reaction Emoji Set

```
Recent:   👍 ❤️ 😂 🎉 🔥 👀 ✅ 💯
Gestures: 👍 👎 👋 🤝 👏 🙌 💪 🙏
Symbols:  ❤️ ✨ ⭐ 🔥 ⚡ 💫
Objects:  🎉 🎁 🏆 📌 ✅ ❌ ❓ ❗
```

### Emoji Styling

```tsx
// With spacing
<span className="mr-2">💰</span> Finance

// Inline with text
<span className="text-base">🎉</span>
```

### When NOT to Use

- Navigation icons (use Lucide instead)
- Form labels
- Button text
- Error messages (use semantic colors)

---

## Component Variants

Components use **Class Variance Authority (CVA)** for consistent variants.

### Button Variants

| Variant | Appearance | Usage |
|---------|------------|-------|
| `default` | Solid primary | Primary actions |
| `secondary` | Gray background | Secondary actions |
| `outline` | Border only | Tertiary actions |
| `ghost` | No background | Subtle actions |
| `destructive` | Red tint | Delete actions |
| `link` | Underlined text | Navigation |

### Button Sizes

| Size | Height | Usage |
|------|--------|-------|
| `xs` | 24px | Compact UI |
| `sm` | 32px | Secondary |
| `default` | 36px | Primary |
| `lg` | 40px | Large actions |
| `icon` | 36px | Icon-only |

### Badge Variants

| Variant | Usage |
|---------|-------|
| `default` | Neutral info |
| `secondary` | Less emphasis |
| `destructive` | Errors, alerts |
| `outline` | Subtle |

---

## Interactive States

### Hover

```css
/* Solid backgrounds */
hover:bg-primary/80  /* 80% opacity */

/* Ghost elements */
hover:bg-muted
```

### Focus

```css
/* Keyboard focus only */
focus-visible:ring-[3px]
focus-visible:ring-ring/50
focus-visible:outline-hidden
```

### Disabled

```css
disabled:pointer-events-none
disabled:opacity-50
```

### Invalid

```css
aria-invalid:ring-destructive/20
aria-invalid:border-destructive
```

---

## Dark Mode

Dark mode uses the `.dark` class on the root element.

### Key Adjustments

| Element | Light | Dark |
|---------|-------|------|
| Background | White | `#1A1A1A` |
| Text | `gray-900` | `gray-100` |
| Borders | `gray-200` | `gray-800` |
| Primary | Darker blue | Lighter blue |

### Implementation

```tsx
// ThemeProvider handles this automatically
<html className={isDark ? "dark" : ""}>
```

---

## Animation

### Transitions

```css
/* Default */
transition-all duration-200

/* Color/shadow only */
transition-[color,box-shadow] duration-100
```

### Common Animations

| Animation | Usage |
|-----------|-------|
| `animate-spin` | Loading spinners |
| `animate-pulse` | Skeleton loaders |
| Chevron rotation | Collapsible sections |

### Timing

- Duration: 100-200ms
- Easing: `ease-out` for exits, `ease-in-out` for morphs

---

## Sidebar / Drawer Pattern

### Product Switcher

The header contains a product switcher that opens a slide-out sidebar from the left.

| Element | Style |
|---------|-------|
| Trigger | Icon (18px) + Name + Chevron-right |
| Icon container | 36px rounded-lg, primary background |
| Drawer width | 85% of screen width |
| Animation | 250ms slide-in, 200ms slide-out |

### Slide-out Animation

```tsx
// Slide from left using Animated API
const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

Animated.timing(slideAnim, {
  toValue: 0,  // or -DRAWER_WIDTH to close
  duration: 250,
  useNativeDriver: true,
}).start();
```

### Glass Effect (iOS)

Uses `expo-glass-effect` for iOS liquid glass appearance:

```tsx
import { GlassView } from "expo-glass-effect";

<GlassView
  style={{ backgroundColor: "rgba(255, 255, 255, 0.95)" }}
  tintColor="systemChromeMaterial"
>
```

Falls back to solid background on non-iOS platforms.

---

## Layout Patterns

### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Grid Layouts

```css
/* Card grids */
grid gap-4 md:grid-cols-2 lg:grid-cols-3

/* Form layouts */
grid gap-4

/* Two-column */
grid grid-cols-2 gap-4
```

### Flex Patterns

```css
/* Horizontal with gap */
flex items-center gap-2

/* Space between */
flex items-center justify-between

/* Wrap */
flex flex-wrap gap-2
```

---

## File Reference

| File | Purpose |
|------|---------|
| `apps/finance/src/app/globals.css` | Global styles, colors, dark mode |
| `apps/finance/src/styles/theme.css` | Typography, shadows, animations |
| `packages/ui/src/*.tsx` | Component implementations |
| `packages/ui/src/utils.ts` | `cn()` utility for class merging |
| `components/ProductSwitcher.tsx` | Header product button |
| `components/ProductDrawer.tsx` | Slide-out sidebar with glass effect |
| `providers/product-provider.tsx` | Product definitions and routing |

---

## Quick Reference

### Do

- Use Tailwind utilities
- Follow the spacing scale
- Use semantic color tokens
- Add focus states for accessibility
- Use Lucide icons
- Keep animations subtle

### Don't

- Use inline styles
- Create custom CSS files
- Use arbitrary color values
- Skip focus states
- Overuse emojis
- Add heavy animations
