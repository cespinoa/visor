# Issue: Add a field formatter for LaTeX rendering via MathJax

**Issue type:** Feature request  
**Module:** MathJax (https://www.drupal.org/project/mathjax)  
**Drupal version:** 10 / 11

---

## Summary

The MathJax module currently provides a **text filter** that renders LaTeX inside
body text. This is great for full-text fields processed through a text format, but
it leaves a gap: **plain string fields** stored without a text format (e.g., a
`string` or `string_long` field containing a formula like `pte_total / population * 100`)
cannot be rendered as typeset mathematics through the normal field display or Views.

This patch proposes a new **FieldFormatter** plugin — `MathjaxLatexFormatter` —
that fills that gap. It integrates naturally with Drupal's field display system and
with Drupal Views via the "Format" column.

---

## Use case

Consider a content type or external entity with a `formula` field that stores
short mathematical expressions in pseudo-LaTeX or plain-text notation:

```
pte_total / population * 100
(available_housing - needed_housing) / needed_housing * 100
avg(tourist_pressure_km2)
```

These formulas are stored in plain text because they are also used programmatically
(e.g., as inputs to data-processing scripts). Adding LaTeX escape sequences to the
stored value would break those scripts. The formatter solves this by performing all
LaTeX transformations **at render time only**, without touching the stored value.

---

## Proposed formatter: `MathjaxLatexFormatter`

**Plugin id:** `mathjax_latex`  
**Label:** "LaTeX (MathJax)"  
**Compatible field types:** `string`, `string_long`

### Formatter settings

| Setting | Type | Default | Description |
|---|---|---|---|
| **Rendering mode** | select | `display` | `display` wraps in `\[...\]`; `inline` wraps in `\(...\)`; `passthrough` outputs raw value (field already contains delimiters) |
| **Convert slashes to fractions** | checkbox | ✓ | Transforms `a / b` → `\frac{a}{b}` so numerator and denominator are separated by a horizontal bar |
| **Render multi-part identifiers as text** | checkbox | ✓ | Wraps identifiers containing underscores (e.g. `rit_km2`) in `\text{}`, preventing LaTeX from interpreting `_` as a subscript operator |
| **Italic** | checkbox | ✗ | Adds CSS `font-style: italic` to the wrapper element |
| **Boxed** | checkbox | ✗ | Wraps the formula in `\boxed{}`, drawing a mathematical border around it |

### Inline notes via `|` separator

If the field value contains a `|` character, the text after it is treated as a
**plain-text annotation** and rendered below the formula in a smaller, muted style.
This is useful when formulas carry notes stored alongside them:

```
max(tourist_pressure_km2) | Excluding capped values
```

Renders as: the formula typeset by MathJax + a small annotation line below.

### Rendering pipeline (transformations applied in order)

1. Strip the `| note` suffix (if present).
2. Convert `TOKEN / TOKEN` → `\frac{TOKEN}{TOKEN}` (if enabled).
3. Wrap underscored identifiers in `\text{}` (if enabled).
4. Wrap in `\boxed{}` (if enabled).
5. Add LaTeX delimiters according to mode.
6. Output in a `<div class="tex2jax_process">` (display/passthrough) or
   `<span class="tex2jax_process">` (inline), which triggers MathJax processing.
7. Attach `mathjax/config`, `mathjax/source`, `mathjax/setup` libraries.

None of these steps modify the stored field value.

### Example transformations

| Stored value | LaTeX output (display mode, all options on) |
|---|---|
| `rit_km2` | `\[\text{rit\_km2}\]` → displays as plain text identifier |
| `pte_total / population * 100` | `\[\frac{\text{pte\_total}}{population} * 100\]` |
| `(a - b) / c * 100` | `\[\frac{(a - b)}{c} * 100\]` |
| `max(x_value) \| Excluding capped values` | formula + annotation |
| `\frac{a}{b}` (passthrough) | passed to MathJax as-is |

---

## Files attached

- `MathjaxLatexFormatter.php` — the FieldFormatter plugin, ready to drop into
  `src/Plugin/Field/FieldFormatter/` inside the MathJax module.
- `mathjax-latex-formatter.css` — minimal CSS for the italic modifier and the
  inline annotation style. Should be registered as a `mathjax/latex_formatter`
  library entry in `mathjax.libraries.yml`:

```yaml
latex_formatter:
  version: VERSION
  css:
    component:
      css/mathjax-latex-formatter.css: {}
```

---

## Notes for the maintainer

- The `convert_fracs` regex handles single-level divisions. Nested divisions
  (e.g. `a / b / c`) are converted left-to-right: `\frac{\frac{a}{b}}{c}`.
  This covers all practical cases in the original use case; edge cases with
  complex nested parentheses are out of scope for this initial proposal.

- The `convert_ids` regex intentionally does **not** affect LaTeX command names
  (e.g., `frac` inside `\frac{}`), because those tokens do not contain underscores.

- Both `convert_fracs` and `convert_ids` are no-ops in `passthrough` mode, since
  the field value is expected to contain valid LaTeX already.

- The formatter respects `config_type` from `mathjax.settings`: when the module
  is configured for global library loading (`config_type == 1`), the formatter
  does not duplicate `drupalSettings.mathjax`; when using per-element config
  (`config_type == 0`), it injects the full settings object on each element.

---

## Credits

Original implementation developed for a tourism-impact data viewer
(Canary Islands, Spain). Contributed back to the community.
