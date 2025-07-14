# Styling Guide - Tailwind-First Approach

## Philosophy

This project follows a **Tailwind-first approach** to styling. Custom CSS/SCSS should be avoided except in very specific cases.

## File Structure

```
src/
├── main.ts            # Imports Tailwind CSS
├── styles/
│   ├── main.scss      # Only imports base.scss and tailwindcss
│   └── base.scss      # CSS variables and global resets ONLY
└── components/        # All components use Tailwind classes
```

## Critical Rules

### ✅ **base.scss** - CSS Variables & Global Resets Only

- CSS custom properties (variables) for theming
- Global resets (`*, body`, etc.)
- **NEVER use `@apply` directives**

### ✅ **main.scss** - Minimal Import File

- Import `base.scss` for custom variables
- Import `tailwindcss` for utility classes
- **Nothing else**

### ✅ **Components** - Pure Tailwind Utilities

- Use only Tailwind utility classes
- Reference CSS variables with `var(--variable-name)` if needed
- **Never write custom CSS in components**

## Rules

### ✅ DO

- Use Tailwind utility classes for all styling
- Use shadcn-vue components for UI elements
- Apply responsive design with Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, etc.)
- Use Tailwind's color palette and spacing scale
- Combine utilities for complex layouts (`flex items-center justify-between`)

### ❌ DON'T

- Create new CSS/SCSS files for components
- Add custom styles in `<style>` blocks
- Use `@apply` directives anywhere (this breaks separation of concerns)
- Write media queries (use Tailwind's responsive prefixes)
- Import Tailwind in individual components

## Common Patterns

### Layout

```vue
<!-- Container with padding -->
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"></div>
```

### Typography

```vue
<!-- Headings -->
<h1 class="text-3xl font-bold text-gray-900"></h1>
```

### Components

```vue
<!-- Cards -->
<div class="bg-white rounded-lg shadow-md p-6"></div>
```

### States & Interactions

```vue
<!-- Hover states -->
<div class="hover:bg-gray-50 transition-colors"></div>
```

## Architecture Principles

### Separation of Concerns

- **CSS Variables** (base.scss): Theme tokens, design system values
- **Tailwind Utilities**: All component styling, layout, interactions
- **No mixing**: Never use `@apply` to blur this separation

### Why No @apply?

- Breaks Tailwind's utility-first philosophy
- Makes styles harder to track and debug
- Creates hybrid approach that's neither pure CSS nor pure utilities
- Reduces build-time optimizations

## Special Cases

The only acceptable cases for custom CSS in `base.scss`:

1. **CSS custom properties** for theme variables
2. **Global resets** (`*`, `body`, etc.)
3. **Third-party library overrides** that can't use Tailwind classes

**Never acceptable:**

- `@apply` directives
- Component-specific styles
- Complex selectors or nested rules

## Tools & Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn-vue Components](https://www.shadcn-vue.com/)
- [Tailwind UI Components](https://tailwindui.com/) (for inspiration)

## Migration Strategy

When converting existing CSS to Tailwind:

1. Identify the visual purpose of the styles
2. Find equivalent Tailwind utility classes
3. Remove the original CSS/SCSS
4. Test responsiveness across breakpoints
5. Verify accessibility (focus states, contrast, etc.)

Remember: If you can't achieve something with Tailwind utilities, consider if it's really necessary before writing custom CSS.
