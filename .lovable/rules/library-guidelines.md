# Kind Code Library — Guidelines

## Components

The design system exports these components — import them from `@ws-dmvcorb9by5c8t7ibzfl/b9083fdb-be9e-40fb-bf94-41ca6242ef09` and compose them before building anything from scratch:

`Avatar`, `Badge`, `BottomNavigation`, `Button`, `CardContent`, `CardHeader`, `Card`, `Field`, `IconButton`, `Input`, `ListItem`, `NavAction`, `NavItem`, `ProgressSteps`, `SearchInput`, `SegmentedControl`, `Select`, `Sidebar`, `StatCard`, `StatusIndicator`, `Tabs`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-dmvcorb9by5c8t7ibzfl/b9083fdb-be9e-40fb-bf94-41ca6242ef09/design-system/provisionkh/theme.css` (source — preferred import)
- `@ws-dmvcorb9by5c8t7ibzfl/b9083fdb-be9e-40fb-bf94-41ca6242ef09/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

