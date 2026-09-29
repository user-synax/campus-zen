# CampusZen Design System

## Mission
Create implementation-ready, token-driven UI guidance for CampusZen — a student-first social network. Optimized for consistency, accessibility, and fast delivery.

## Brand
- Product/brand: CampusZen
- Audience: college students in India
- Product surface: full-stack social web application (X/Twitter-style)
- Status: MVP complete (September 2026)

## Visual Style
- Dark theme with warm peach accent
- Monospace typography throughout (JetBrains Mono)
- Clean, functional, minimal interface
- Micro-animations for feedback and delight

## Typography
- Font family: `JetBrains Mono Variable`, `JetBrains Mono`, monospace
- Base size: 15px (`--font-size-base`)
- Line height: 24.375px (`--font-line-base`)
- Weight: 400 (regular)
- Tracking: tight

## Design Tokens

### Colors

| Token | Variable | Hex Value | Usage |
|-------|----------|-----------|-------|
| Background | `--cz-bg` | `#000000` | Page background |
| Surface | `--cz-surface` | `#0c122c` | Card/panel background |
| Surface Strong | `--cz-surface-strong` | `#060b1e` | Elevated surfaces |
| Muted | `--cz-muted` | `#7d82d9` | Muted backgrounds, scrollbar |
| Primary Text | `--cz-text-primary` | `#ffcead` | Primary text (warm peach) |
| Secondary Text | `--cz-text-secondary` | `#b6a6b2` | Secondary/muted text |
| Inverse Text | `--cz-text-inverse` | `#0c0e10` | Text on accent backgrounds |
| Border | `--cz-border` | `rgba(255, 206, 173, 0.12)` | Default borders |
| Border Strong | `--cz-border-strong` | `rgba(255, 206, 173, 0.22)` | Hover/strong borders |
| Border Focus | `--cz-border-focus` | `rgba(125, 130, 217, 0.6)` | Focus rings, selection |
| Error | `--cz-error` | `#ff5a6a` | Error states |
| Success | `--cz-success` | `#7df0b2` | Success states |
| Like Color | `--like-color` | `#f40051` | Like button accent |

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing, icon gaps |
| `--space-2` | 6px | Small gaps |
| `--space-3` | 8px | Default component padding |
| `--space-4` | 10px | Medium gaps |
| `--space-5` | 12px | Section padding |
| `--space-6` | 14px | Large gaps |
| `--space-7` | 16px | Section margins |
| `--space-8` | 18px | Page margins |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Small buttons, inputs |
| `--radius-md` | 12px | Cards, modals |
| `--radius-lg` | 16px | Large cards |
| `--radius-xl` | 20px | Feature sections |
| `--radius-full` | 999px | Pills, avatars |

### Motion Tokens

| Token | Value | Purpose |
|-------|-------|----------|
| `--duration-micro` | 80ms | Quick transitions (color changes) |
| `--duration-quick` | 150ms | Standard transitions |
| `--duration-fast` | 250ms | Modal open/close |
| `--duration-medium` | 350ms | Panel reveals, icon swaps |
| `--duration-slow` | 400ms | Page transitions |
| `--duration-very-slow` | 500ms | Stagger reveals, number pop-in |
| `--duration-stagger` | 40ms | Stagger delay between items |

### Easing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-smooth-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Standard ease-out |
| `--ease-in-out` | `ease-in-out` | Symmetric transitions |
| `--ease-out` | `ease-out` | Quick ease-out |
| `--ease-linear` | `linear` | Constant speed |
| `--ease-bounce` | `cubic-bezier(0.34, 1.36, 0.64, 1)` | Subtle bounce |
| `--ease-bounce-strong` | `cubic-bezier(0.34, 3.85, 0.64, 1)` | Strong bounce (like pop) |

## Animations

### Micro-interactions

| Animation | Class | Purpose |
|-----------|-------|--------|
| Error shake | `.t-input.is-shaking` | Form validation error feedback |
| Icon swap | `.t-icon-swap` | Password visibility toggle |
| Checkbox draw | `.t-check` | Custom checkbox check animation |
| Text stagger | `.t-stagger-line` | Text reveal with stagger |
| Success check | `.t-success-check` | Success state checkmark |
| Modal | `.t-modal` | Modal open/close with scale |
| Number pop-in | `.t-digit-group` | Animated number counter |
| Panel slide | `.t-panel-slide` | Panel/sidebar slide-in |
| Like burst | `.t-like` + particles | Like button with particle explosion |

### Animation Rules

- All animations respect `prefers-reduced-motion: reduce`
- Use `will-change` for animated properties
- Keep durations under 500ms for feedback animations
- Use appropriate easing for natural motion

## Component States

Every interactive component must define:

- **Default**: Base appearance
- **Hover**: Subtle visual feedback (border color change, background shift)
- **Focus-visible**: Clear focus ring using `--cz-border-focus`
- **Active**:_pressed_ state (slight scale/transform)
- **Disabled**: Reduced opacity, no interaction
- **Loading**: Skeleton or spinner state
- **Error**: Red border, error message below input

## Layout

### Desktop (3-column)

```
┌─────────────┬──────────────────────┬──────────────────┐
│  Left Nav   │        Feed          │   Right Panel    │
│   (240px)   │                      │    (320px)       │
│             │  Main content area   │                  │
│ Home        │  - Create post       │ Trending hash-   │
│ Search      │  - Post feed         │ tags             │
│ Profile     │  - Suggestions       │ Suggested users  │
│             │                      │                  │
└─────────────┴──────────────────────┴──────────────────┘
```

### Mobile (bottom nav)

- Feed (home)
- Search
- Create post
- Notifications
- Profile

## Accessibility Requirements

- Target: WCAG 2.2 AA
- Keyboard-first interactions required
- Focus-visible rules: 2px solid `--cz-muted` outline with 2px offset
- Contrast: Primary text `#ffcead` on `#000000` = AAA compliant
- Semantic HTML throughout
- ARIA labels for icon-only buttons
- Reduced motion support via media query

## Quality Gates

- Every non-negotiable rule must use "must"
- Every recommendation should use "should"
- Every accessibility rule must be testable in implementation
- Teams should prefer system consistency over local visual exceptions
