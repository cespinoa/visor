<?php

namespace Drupal\mathjax\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Form\FormStateInterface;

/**
 * Field formatter that renders string fields as typeset mathematics via MathJax.
 *
 * Useful for fields that store mathematical formulas as plain text (e.g. for
 * programmatic use) and need to be rendered as proper typeset math in the UI.
 * All LaTeX transformations happen at render time; the stored value is never
 * modified.
 *
 * @FieldFormatter(
 *   id = "mathjax_latex",
 *   label = @Translation("LaTeX (MathJax)"),
 *   field_types = {
 *     "string",
 *     "string_long",
 *   }
 * )
 */
class MathjaxLatexFormatter extends FormatterBase {

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    return [
      'mode'          => 'display',
      'convert_fracs' => TRUE,
      'convert_ids'   => TRUE,
      'italic'        => FALSE,
      'boxed'         => FALSE,
    ] + parent::defaultSettings();
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {
    $elements = parent::settingsForm($form, $form_state);

    $elements['mode'] = [
      '#type'          => 'select',
      '#title'         => $this->t('Rendering mode'),
      '#options'       => [
        'display'     => $this->t('Display — \[...\] (block, centred)'),
        'inline'      => $this->t('Inline — \(...\) (within text flow)'),
        'passthrough' => $this->t('Pass through (field already contains delimiters)'),
      ],
      '#default_value' => $this->getSetting('mode'),
      '#description'   => $this->t(
        'Display centres the formula on its own line. '
        . 'Inline inserts it within surrounding text. '
        . 'Pass through: the field value already contains valid LaTeX delimiters.'
      ),
    ];

    $elements['convert_ids'] = [
      '#type'          => 'checkbox',
      '#title'         => $this->t('Render multi-part identifiers as text'),
      '#description'   => $this->t(
        'Wraps identifiers containing underscores (e.g. <code>pressure_km2</code>) '
        . 'in <code>\text{}</code>, preventing LaTeX from treating <code>_</code> '
        . 'as a subscript operator. The stored value is not modified. '
        . 'Not applied in pass-through mode.'
      ),
      '#default_value' => $this->getSetting('convert_ids'),
    ];

    $elements['convert_fracs'] = [
      '#type'          => 'checkbox',
      '#title'         => $this->t('Convert slash divisions to fractions'),
      '#description'   => $this->t(
        'Transforms <code>a / b</code> into <code>\frac{a}{b}</code> so that '
        . 'numerator and denominator are displayed separated by a horizontal bar. '
        . 'Recognises plain tokens (<code>\w+</code>) and parenthesised groups '
        . '(<code>(...)</code>) as operands. Not applied in pass-through mode.'
      ),
      '#default_value' => $this->getSetting('convert_fracs'),
    ];

    $elements['italic'] = [
      '#type'          => 'checkbox',
      '#title'         => $this->t('Italic'),
      '#description'   => $this->t(
        'Adds <em>font-style: italic</em> to the wrapper element via a CSS class. '
        . 'Affects HTML-rendered content such as <code>\text{}</code> identifiers '
        . 'and inline annotations.'
      ),
      '#default_value' => $this->getSetting('italic'),
    ];

    $elements['boxed'] = [
      '#type'          => 'checkbox',
      '#title'         => $this->t('Boxed'),
      '#description'   => $this->t(
        'Wraps the formula in <code>\boxed{}</code>, which draws a mathematical '
        . 'border around it using MathJax\'s own rendering engine. '
        . 'Not applied in pass-through mode.'
      ),
      '#default_value' => $this->getSetting('boxed'),
    ];

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $mode_labels = [
      'display'     => $this->t('Display (\[...\])'),
      'inline'      => $this->t('Inline (\(...\))'),
      'passthrough' => $this->t('Pass through'),
    ];
    $mode    = $this->getSetting('mode');
    $summary = [$this->t('Mode: @mode', ['@mode' => $mode_labels[$mode] ?? $mode])];

    if ($this->getSetting('convert_ids') && $mode !== 'passthrough') {
      $summary[] = $this->t('Identifiers → \text{}');
    }
    if ($this->getSetting('convert_fracs') && $mode !== 'passthrough') {
      $summary[] = $this->t('Divisions → fractions');
    }
    if ($this->getSetting('italic')) {
      $summary[] = $this->t('Italic');
    }
    if ($this->getSetting('boxed') && $mode !== 'passthrough') {
      $summary[] = $this->t('Boxed (\boxed{})');
    }

    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    $elements = [];

    $config      = \Drupal::config('mathjax.settings');
    $config_type = (int) $config->get('config_type');

    // The three libraries provided by the MathJax module.
    $attachments = [
      'library' => [
        'mathjax/config',
        'mathjax/source',
        'mathjax/setup',
      ],
    ];

    // config_type 0: per-element config injected via drupalSettings.
    // config_type 1: global loading via hook_page_attachments, already present.
    if ($config_type === 0) {
      $attachments['drupalSettings'] = [
        'mathjax' => [
          'config_type' => $config_type,
          'config'      => json_decode($config->get('default_config_string')),
        ],
      ];
    }

    $mode          = $this->getSetting('mode');
    $convert_fracs = $this->getSetting('convert_fracs');
    $convert_ids   = $this->getSetting('convert_ids');
    $italic        = $this->getSetting('italic');
    $boxed         = $this->getSetting('boxed');

    if ($italic) {
      $attachments['library'][] = 'mathjax/latex_formatter';
    }

    foreach ($items as $delta => $item) {
      $value = $item->value;
      if ($value === NULL || $value === '') {
        continue;
      }

      // Split optional inline annotation appended after a '|' character.
      // Example: "a / b * 100 | Excluding capped values"
      $annotation = '';
      $pipe       = strrpos($value, '|');
      if ($pipe !== FALSE) {
        $annotation = '<span class="mathjax-latex-annotation">'
          . htmlspecialchars(trim(substr($value, $pipe + 1)))
          . '</span>';
        $value = trim(substr($value, 0, $pipe));
      }

      if ($mode !== 'passthrough') {
        // 1. Convert divisions first, so that \frac{a_b}{c_d} is well-formed
        //    before the identifier-wrapping step.
        if ($convert_fracs) {
          $value = $this->convertFractions($value);
        }
        // 2. Wrap underscored identifiers in \text{} to prevent subscript
        //    interpretation.
        if ($convert_ids) {
          $value = $this->convertIdentifiers($value);
        }
        // 3. Optionally surround the whole formula with \boxed{}.
        if ($boxed) {
          $value = '\\boxed{' . $value . '}';
        }
      }

      switch ($mode) {
        case 'inline':
          $latex = '\(' . $value . '\)';
          $tag   = 'span';
          break;

        case 'passthrough':
          $latex = $value;
          $tag   = 'div';
          break;

        case 'display':
        default:
          $latex = '\[' . $value . '\]';
          $tag   = 'div';
          break;
      }

      $classes = ['tex2jax_process', 'mathjax-latex-formula'];
      if ($italic) {
        $classes[] = 'mathjax-latex-formula--italic';
      }

      $elements[$delta] = [
        '#type'       => 'html_tag',
        '#tag'        => $tag,
        '#value'      => $latex . $annotation,
        '#attributes' => ['class' => $classes],
        '#attached'   => $attachments,
      ];
    }

    return $elements;
  }

  /**
   * Wraps underscored identifiers in \text{} to prevent subscript rendering.
   *
   * In LaTeX math mode, the underscore character is the subscript operator.
   * An identifier like "pressure_km2" renders as "pressure" with subscript
   * "km2". Wrapping it in \text{pressure_km2} switches to text mode and
   * preserves the underscore as a literal character.
   *
   * LaTeX command tokens already introduced by this formatter (e.g. "frac"
   * inside "\frac{}{}") do not contain underscores and are therefore not
   * affected by this transformation.
   *
   * @param string $formula
   *   A formula string that may contain identifiers with underscores.
   *
   * @return string
   *   The formula with underscored identifiers wrapped in \text{}.
   */
  private function convertIdentifiers(string $formula): string {
    return preg_replace(
      '/\b([a-zA-Z]\w*(?:_\w+)+)\b/',
      '\\\\text{$1}',
      $formula
    );
  }

  /**
   * Converts slash-division expressions to \frac{numerator}{denominator}.
   *
   * Recognises two operand forms around the '/' operator:
   *   - Plain token (identifier or number): \w+
   *   - Parenthesised group: \([^)]+\)
   *
   * Transformations are applied left-to-right. Examples:
   *   "a / b * 100"       → "\frac{a}{b} * 100"
   *   "(a - b) / c * 100" → "\frac{(a - b)}{c} * 100"
   *   "a / (b + c)"       → "\frac{a}{(b + c)}"
   *
   * @param string $formula
   *   A formula string that may contain slash-division expressions.
   *
   * @return string
   *   The formula with slash divisions replaced by \frac{}{}.
   */
  private function convertFractions(string $formula): string {
    $token = '(?:\([^)]*\)|\w+)';

    return preg_replace(
      '/(' . $token . ')\s*\/\s*(' . $token . ')/',
      '\\\\frac{$1}{$2}',
      $formula
    );
  }

}
