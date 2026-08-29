# ArchForge design system

## Direction

ArchForge is technical, precise, calm, developer-oriented, AI-native, and professional. It favors high information density with strong hierarchy and breathing room rather than decoration. The canvas is the focal work surface; panels support it without competing with it.

## Semantic tokens

Tokens are CSS custom properties consumed through utilities or component styles. Components must not embed raw color values when a semantic token exists.

| Group | Tokens |
| --- | --- |
| Background | `--surface-canvas`, `--surface-1`, `--surface-2`, `--surface-raised`, `--surface-overlay` |
| Foreground | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse` |
| Borders | `--border-subtle`, `--border-default`, `--border-strong` |
| Status | `--status-success`, `--status-warning`, `--status-error`, `--status-info` plus soft surfaces |
| Interaction | `--interactive`, `--interactive-hover`, `--interactive-active`, `--selection`, `--focus-ring` |
| Semantics | `--semantic-capability`, `--semantic-technology`, `--semantic-provider`, `--semantic-service`, `--semantic-existing`, `--semantic-ai` |

Use a neutral graphite/slate foundation, cool blue selection, restrained teal success, amber warning, and coral error. Every foreground/background pairing must meet WCAG AA. Status never relies on color alone.

- Spacing: 4px base; `--space-1` through `--space-8` map to 4, 8, 12, 16, 24, 32, 48, 64px.
- Radius: 4px controls, 8px cards/nodes, 12px panels/dialogs; pills only for badges.
- Typography: sans for interface, mono for identifiers and technical values; 12/14/16px body scale, compact 1.35-1.5 line height, restrained headings.
- Shadows: borders before shadows; one subtle raised shadow and one overlay shadow.
- Z-index: canvas 0, chrome 10, sticky 20, popover 30, dialog 40, toast 50.
- Motion: 120-180ms for hover/selection, 200-240ms for panels; respect reduced motion and never animate layout gratuitously.

## Primitives

Reusable primitives cover buttons, icon buttons, inputs, text areas, selects, badges, cards, panels, toolbars, dialogs, tabs, tooltips, inspectors, empty states, error states, validation messages, and AI activity entries. Each supports keyboard focus, disabled state, appropriate accessible naming, and density variants only where demonstrated. Extend a primitive before duplicating it in a feature.

## Canvas

- Nodes use a compact header, semantic icon/marker, name, type, and resolution trail. Existing infrastructure receives a fixed/link marker.
- Hierarchy is visible as `capability -> technology -> provider -> service`, never encoded as a single vendor-specific node type.
- Connections are quiet by default, stronger on hover/selection, directed where semantics require, and labeled when the relationship is not obvious.
- Selection uses a two-part treatment: tinted surface plus clear ring. Hover is lower contrast; keyboard focus uses the global focus ring.
- Grid is subtle and scale-aware. Minimap uses semantic colors and a high-contrast viewport. Groups have labeled, low-contrast boundaries.
- Warning/error markers sit on the affected object and link to the validation panel.

## Architecture semantics

Capability, technology, provider, cloud service, and existing infrastructure each receive distinct iconography and semantic accent. Warning and error use status tokens plus symbols. AI-generated actions use the AI accent and provenance label, but otherwise render through the same canonical components; agent output is not a second visual language.

## Layout

Desktop uses a top command bar, left requirements/library rail, central canvas, right inspector, and collapsible bottom activity/validation region. Narrow layouts prioritize a readable overview and move rails into modal sheets. Empty states explain the next valid action. Error states preserve user data and present recovery.
