<?php

namespace Drupal\visor\Plugin\Field\FieldFormatter;

use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Form\FormStateInterface;

/**
 * Formateador de campo LaTeX mediante MathJax.
 *
 * Envuelve el valor del campo en los delimitadores LaTeX adecuados y adjunta
 * las librerías del módulo MathJax para renderizar la fórmula en el navegador.
 *
 * @FieldFormatter(
 *   id = "visor_latex",
 *   label = @Translation("LaTeX (MathJax)"),
 *   field_types = {
 *     "string",
 *     "string_long",
 *   }
 * )
 */
class LatexFormatter extends FormatterBase {

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
      '#title'         => $this->t('Modo de renderizado'),
      '#options'       => [
        'display'     => $this->t('Bloque — \[...\]'),
        'inline'      => $this->t('En línea — \(...\)'),
        'passthrough' => $this->t('Sin delimitadores (el campo los incluye)'),
      ],
      '#default_value' => $this->getSetting('mode'),
      '#description'   => $this->t(
        'Bloque centra la fórmula en su propia línea. '
        . 'En línea la inserta dentro del texto. '
        . 'Sin delimitadores: el valor del campo ya contiene los delimitadores LaTeX.'
      ),
    ];

    $elements['convert_ids'] = [
      '#type'          => 'checkbox',
      '#title'         => $this->t('Representar nombres de variables como texto'),
      '#description'   => $this->t(
        'Envuelve los identificadores con guión bajo (p. ej. <code>rit_km2</code>) en '
        . '<code>\text{}</code>, evitando que LaTeX los interprete como "base + subíndice". '
        . 'No modifica las fórmulas originales.'
      ),
      '#default_value' => $this->getSetting('convert_ids'),
    ];

    $elements['convert_fracs'] = [
      '#type'          => 'checkbox',
      '#title'         => $this->t('Convertir divisiones a fracciones'),
      '#description'   => $this->t(
        'Transforma <code>a / b</code> en <code>\frac{a}{b}</code> para que '
        . 'el numerador y el denominador aparezcan separados por una línea horizontal. '
        . 'No se aplica en modo "Sin delimitadores".'
      ),
      '#default_value' => $this->getSetting('convert_fracs'),
    ];

    $elements['italic'] = [
      '#type'          => 'checkbox',
      '#title'         => $this->t('Cursiva'),
      '#description'   => $this->t(
        'Aplica <em>font-style: italic</em> al contenedor. Afecta al texto renderizado '
        . 'como HTML (identificadores en <code>\text{}</code> y notas).'
      ),
      '#default_value' => $this->getSetting('italic'),
    ];

    $elements['boxed'] = [
      '#type'          => 'checkbox',
      '#title'         => $this->t('Recuadro'),
      '#description'   => $this->t(
        'Envuelve la fórmula en <code>\boxed{}</code>, que dibuja un recuadro '
        . 'dentro del propio sistema matemático de MathJax. '
        . 'No se aplica en modo "Sin delimitadores".'
      ),
      '#default_value' => $this->getSetting('boxed'),
    ];

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $labels = [
      'display'     => $this->t('Bloque (\[...\])'),
      'inline'      => $this->t('En línea (\(...\))'),
      'passthrough' => $this->t('Sin delimitadores'),
    ];
    $mode = $this->getSetting('mode');
    $summary = [$this->t('Modo: @mode', ['@mode' => $labels[$mode] ?? $mode])];

    if ($this->getSetting('convert_ids') && $mode !== 'passthrough') {
      $summary[] = $this->t('Variables → \text{}');
    }
    if ($this->getSetting('convert_fracs') && $mode !== 'passthrough') {
      $summary[] = $this->t('Divisiones → fracciones');
    }
    if ($this->getSetting('italic')) {
      $summary[] = $this->t('Cursiva');
    }
    if ($this->getSetting('boxed') && $mode !== 'passthrough') {
      $summary[] = $this->t('Recuadro (\boxed{})');
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

    $attachments = [
      'library' => [
        'mathjax/config',
        'mathjax/source',
        'mathjax/setup',
      ],
    ];

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

    // La librería propia solo se necesita si alguna opción visual está activa.
    if ($italic) {
      $attachments['library'][] = 'visor/visor_latex_formatter';
    }

    foreach ($items as $delta => $item) {
      $value = $item->value;
      if ($value === NULL || $value === '') {
        continue;
      }

      // Separar notas opcionales que siguen al carácter '|'
      // Ej.: "a / b * 100 | Excluyendo valores 100"
      $nota   = '';
      $pipe   = strrpos($value, '|');
      if ($pipe !== FALSE) {
        $nota  = '<span class="visor-latex-nota">' . htmlspecialchars(trim(substr($value, $pipe + 1))) . '</span>';
        $value = trim(substr($value, 0, $pipe));
      }

      if ($mode !== 'passthrough') {
        // Primero convertir fracciones (antes de envolver identificadores,
        // para que \frac{a_b}{c_d} quede bien formado).
        if ($convert_fracs) {
          $value = $this->convertFracciones($value);
        }
        // Envolver identificadores con guión bajo en \text{} para que
        // no se interpreten como "base_subíndice".
        if ($convert_ids) {
          $value = $this->convertIdentificadores($value);
        }
        // Recuadro: \boxed{} dibuja el marco dentro del sistema matemático.
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

      $classes = ['tex2jax_process', 'visor-latex-formula'];
      if ($italic) {
        $classes[] = 'visor-latex-formula--italic';
      }

      $elements[$delta] = [
        '#type'       => 'html_tag',
        '#tag'        => $tag,
        '#value'      => $latex . $nota,
        '#attributes' => ['class' => $classes],
        '#attached'   => $attachments,
      ];
    }

    return $elements;
  }

  /**
   * Envuelve en \text{} los identificadores que contienen guiones bajos.
   *
   * En modo matemático LaTeX, el carácter '_' es el operador de subíndice.
   * "rit_km2" se renderiza como "rit" con subíndice "km2". Para evitarlo
   * envolvemos el identificador completo en \text{}, que fuerza modo texto
   * y preserva el guión bajo como carácter literal.
   *
   * Se excluyen deliberadamente los tokens que ya han sido procesados por
   * otros comandos LaTeX (ej. el propio "frac" dentro de "\frac"), que no
   * contienen guiones bajos y por tanto no coinciden con el patrón.
   *
   * Ejemplos:
   *   "rit_km2"                         → "\text{rit_km2}"
   *   "\frac{pte_total}{poblacion}"     → "\frac{\text{pte_total}}{poblacion}"
   *   "avg(plazas_at_residenciales)"    → "avg(\text{plazas_at_residenciales})"
   *   "poblacion"   (sin guión bajo)    → "poblacion"  (sin cambios)
   */
  private function convertIdentificadores(string $formula): string {
    // Patrón: palabra que empieza por letra y contiene al menos un guión bajo.
    // \b garantiza que solo coincidimos con tokens completos, no subcadenas.
    return preg_replace(
      '/\b([a-zA-Z]\w*(?:_\w+)+)\b/',
      '\\\\text{$1}',
      $formula
    );
  }

  /**
   * Convierte divisiones con barra (a / b) a \frac{a}{b}.
   *
   * Reconoce dos tipos de operando alrededor del '/':
   *   - Identificador/número:    \w+
   *   - Expresión entre paréntesis: \([^)]+\)
   *
   * Se aplica de izquierda a derecha en caso de divisiones encadenadas.
   * La multiplicación final (* 100) se deja tal cual; MathJax la renderiza
   * correctamente como "× 100" si el usuario prefiere, o se puede ampliar
   * la conversión en el futuro.
   *
   * Ejemplos:
   *   "a / b * 100"                  → "\frac{a}{b} * 100"
   *   "(a - b) / c * 100"            → "\frac{(a - b)}{c} * 100"
   *   "a / (b + c) * 100"            → "\frac{a}{(b + c)} * 100"
   */
  private function convertFracciones(string $formula): string {
    // Un "token" es un identificador/número o un grupo entre paréntesis.
    $token = '(?:\([^)]*\)|\w+)';

    return preg_replace(
      '/(' . $token . ')\s*\/\s*(' . $token . ')/',
      '\\\\frac{$1}{$2}',
      $formula
    );
  }

}
