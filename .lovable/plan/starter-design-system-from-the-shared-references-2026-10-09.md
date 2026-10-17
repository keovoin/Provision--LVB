# Starter design system from the shared references

## Direction
Create a crisp, high-density product interface system inspired by the two references: white and cool-gray surfaces, teal primary actions, green success states, red destructive states, dark neutral text, compact typography, subtle borders, restrained shadows, and small practical radii. The uploaded screens remain reference-only and will not ship as assets.

## Foundation
- Replace the generic starter palette with semantic light and dark theme tokens for background, surface, text, border, primary teal, accent, success, warning, destructive, focus, and data visualization.
- Add tokenized typography, spacing, radius, elevation, control heights, and motion using the existing Tailwind v4 setup.
- Keep the canonical theme in one attachable CSS entry and document the system’s accessibility, token usage, composition, and visual rules.

## Starter components
Build typed, ref-forwarding, composable components with named variants and accessible states:
- Button and IconButton
- Input, SearchInput, Select, and Field
- Badge and StatusIndicator
- Avatar
- Tabs and SegmentedControl
- Card and StatCard
- NavItem and Sidebar navigation primitives
- ListItem for mobile/results lists
- ProgressSteps
- BottomNavigation

Each component will use only system tokens, support `className` and native props, include focus/disabled/error states where relevant, and be exported through the consumer barrel. Component guidance and examples will be captured in extractable source documentation.

## Showcase
Replace the placeholder home page with a permanent, responsive showcase using the system itself:
- Shared navigation with light/dark theme switching
- Overview page with the visual language and representative compositions
- Colors page with every semantic token and role
- Typography page with the full type scale
- Iconography page with searchable curated Lucide icons
- Components page with searchable navigation, interactive specimens, variants/states, realistic dashboard and mobile contexts, and copyable usage examples

The showcase will remain preview-only and excluded from attached consumer code.

## Library packaging
- Add the local-library barrel and explicit extraction sources for components and tokens.
- Keep the existing local React/Tailwind classification and scratch starter setting.
- Add design-system guidance and exclusions without hand-authoring publish-generated reference files.
- Record the attach-safe source layout decision in the project guidance file.

## Verification
- Validate the current preview build after implementation.
- Exercise theme switching, component search, navigation, tabs, form controls, and responsive layouts in the browser.
- Check the showcase at desktop and narrow mobile widths, including overflow, contrast, focus visibility, and text fit.
- Confirm the home route has unique product-specific metadata and no starter placeholder remains.
