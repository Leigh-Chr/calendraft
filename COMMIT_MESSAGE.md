feat(design): implement warm modern visual identity with grain textures

Redesign Calendraft's visual identity to create a distinctive "Warm Modern"
aesthetic that differentiates it from generic SaaS products.

## Typography
- Replace Geist Variable with Sora Variable for headings and body text
- Replace Geist Mono with JetBrains Mono Variable for monospace elements
- Update font imports in package.json

## Color Palette
- Migrate from indigo/violet to warm amber/terracotta color scheme
- Implement "Warm Modern" palette with cream backgrounds and amber accents
- Add subtle color variations (hue shifts 44-72) for visual richness
- Update all color variables in light and dark modes using OKLCH color space
- Replace hardcoded indigo colors (#6366f1) with amber (#c2703c) across:
  - Calendar cards and color pickers
  - Event templates and success animations
  - Command palette fallback colors

## Visual Effects
- Add grain texture effects to gradients using SVG noise patterns
- Implement grain-texture class with mix-blend-mode (multiply/screen)
- Enhance aurora gradient with integrated grain and 5 color variations
- Improve gradient-mesh with 4 harmonious color stops
- Add ruled-pattern background to "How it works" section
- Increase visibility of step numbers (opacity 0.2→0.4, stroke 2→2.5px)

## Background Patterns
- Enhance aurora gradient opacity (0.15→0.35 light, 0.2→0.4 dark)
- Improve gradient-mesh with higher opacity and color variations
- Add grain texture to all gradient sections (hero, features, how-it-works)
- Update dot-grid pattern colors to match new palette

## Interactive Elements
- Replace card-glow with card-lift for enhanced hover effects
- Improve BentoCard hover states with stronger amber highlights
- Update gradient-brand with 5 color stops for smoother transitions
- Enhance interactive-glow with amber color scheme

## Meta Tags & Theme
- Update theme-color meta tags to match new warm palette
- Update mask-icon color from indigo to amber
- Adjust CSP for development environment

## Code Quality
- Improve error handling in tRPC client and error helpers
- Add network error detection improvements
- Maintain accessibility with proper contrast ratios
- Use inline SVG for grain (no external requests, better performance)

BREAKING CHANGE: Visual design system completely overhauled. All indigo
colors replaced with amber/terracotta palette. Typography changed from
Geist to Sora/JetBrains Mono.

