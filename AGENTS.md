# Project UI/UX & Quality Standards

All assistants working on CloudPulse AI must adhere to the following standards:

## 1. Human-Centered UI/UX (Anti-AI-Slop Policy)

Follow the principles defined in `human-centered-ui-ux`:

1. **Switchable Light & Dark Themes**:
   - Always maintain a working Light/Dark theme toggle with `localStorage` persistence.
   - Maintain high contrast and crisp typography in both modes. Never build dark-only or light-only interfaces.

2. **No AI Clutter / Technical Model Badges**:
   - Never display raw backend model identifiers (e.g., `amazon.nova-pro-v1:0 (live)`, `gpt-4o-mini`), raw token counts, or internal runtime strings in user-facing headers or hero cards.
   - Present features by their business domain purpose (e.g., `Cloud Governance Engine • Real-time Policy Guard`).

3. **Inverted Hierarchy (Job-to-be-Done First)**:
   - The app must never start on an uncollapsed code editor (`main.tf`), raw configuration files, or walls of text.
   - Lead with actionable findings, primary metrics, and staged remediations above the fold.

4. **Progressive Disclosure (Collapse Secondary Details)**:
   - Keep source code manifests, raw configuration editors, and verbose model rationales **collapsed by default** inside clean `<details>` / accordion sections.
   - Users should only expand them when actively inspecting code or deep rationale.

5. **Proper Rendering of Code, Diffs, and Markdown**:
   - Never display raw unparsed markdown (e.g., raw `###` or backticks) or raw JSON strings.
   - Always parse markdown cleanly and render Git diffs with dedicated syntax-highlighted containers (+ green additions, - red deletions).

6. **Clear, Distinct Navigation**:
   - Tab switching, sidebars, and filters must be visually distinct, tactile, and intuitive. Avoid low-contrast or ambiguous tab states.

## 2. Verification
- Always run `npm run build` and `npm test` before committing.
- Do not fabricate benchmark metrics.
