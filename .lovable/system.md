# ProvisionKH Design System

ProvisionKH is a Khmer-first wholesale commerce system spanning a mobile customer store and a dense desktop operations portal. It should feel practical, modern, quick, and trustworthy rather than decorative.

## Core rules

- Use exported ProvisionKH components before creating parallel controls.
- Use semantic tokens from `theme.css`; never put raw colors, radii, shadows, or spacing into feature components.
- Orange is the primary action and selection color. Green is reserved for successful and paid states. Red communicates destructive, cancelled, failed, or overdue states.
- Keep surfaces white or neutral in light mode and high-contrast neutral in dark mode. Borders are subtle but always explicit.
- Use small practical radii and restrained elevation. Do not use oversized pills for general controls, glass effects, decorative gradients, or ornamental blobs.
- Customer surfaces are mobile-first with touch targets at least 40px high and persistent bottom navigation where appropriate.
- Admin surfaces are desktop-optimized, compact, and scannable, with a left sidebar, concise status badges, and aligned figures.

## Typography and localization

Inter is the Latin and numeric UI font. Noto Sans Khmer is the Khmer UI and content font. Khmer is the default language and English is the secondary language. Preserve readable line height for Khmer and avoid forcing Khmer labels into single-line controls when wrapping is safer. Keep numerals aligned in operational summaries and tables.

```tsx
<p className="font-khmer text-sm font-semibold">បានទទួលប្រាក់</p>
<p className="text-xs text-muted-foreground">Payment received</p>
```

## Component patterns

Expose appearance through named `variant` and `size` props. Merge `className`, spread native props, forward refs, and preserve semantic HTML. Every interactive component needs a visible focus style, a disabled state, and an accessible name when icon-only.

```tsx
<Button variant="primary" size="lg">បញ្ជាទិញ</Button>
<Badge variant="success">Paid</Badge>
<Field label="Phone number" error={error}>
  <Input invalid={Boolean(error)} inputMode="tel" />
</Field>
```

Use `StatusIndicator` for live or transitional states, `Badge` for static classification, `ProgressSteps` for fulfillment, `BottomNavigation` for the customer app, and `Sidebar`/`NavItem` for the operations portal.

## Accessibility

Meet WCAG 2.2 AA contrast. Do not rely on color alone for status. Keep keyboard navigation and focus order logical. Form errors must be visible in text and reflected with `aria-invalid`. Icon-only controls require a concise `label`. Respect reduced-motion preferences and avoid motion that blocks task completion.

## Avoid

- Raw hexadecimal, rgb, hsl, or arbitrary color values in components.
- Green primary buttons or green decorative accents.
- Generic card-heavy layouts that obscure hierarchy.
- Tiny mobile controls, horizontal overflow, or English-only labels in customer contexts.
- Inline styles for visual design; use them only when runtime geometry cannot be expressed through tokens or utilities.
