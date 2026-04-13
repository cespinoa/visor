<?php

declare(strict_types=1);

namespace Drupal\visor\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\File\FileSystemInterface;
use Drupal\media\Entity\Media;
use Drupal\node\Entity\Node;
use Drupal\taxonomy\Entity\Term;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Gestiona la generación y persistencia de informes.
 */
final class InformeController extends ControllerBase {

  /**
   * Guarda o sobreescribe un informe a partir del HTML generado por el visor.
   *
   * Payload JSON esperado:
   *   html            string  HTML completo del informe
   *   etiqueta        string  Nombre de la entidad (ej. "Canarias")
   *   ambito          string  Ámbito geográfico (ej. "canarias")
   *   tipo            string  Tipo de informe (ej. "Completo")
   *   fecha_snapshot  string  Fecha del snapshot en formato YYYY-MM-DD
   */
  public function guardar(Request $request): JsonResponse {
    $data = json_decode($request->getContent(), TRUE);

    $html           = $data['html']            ?? '';
    $etiqueta       = $data['etiqueta']        ?? '';
    $ambito         = $data['ambito']          ?? '';
    $tipo           = $data['tipo']            ?? 'Completo';
    $fecha_snapshot = $data['fecha_snapshot']  ?? date('Y-m-d');

    if (!$html || !$etiqueta || !$ambito) {
      return new JsonResponse(['error' => 'Faltan campos requeridos: html, etiqueta, ambito'], 400);
    }

    $tid_etiqueta = $this->obtenerOCrearTermino($etiqueta, 'etiqueta');
    $tid_ambito   = $this->obtenerOCrearTermino($ambito, 'ambito');
    $tid_tipo     = $this->obtenerOCrearTermino($tipo, 'tipo');

    // Busca un nodo existente para la misma combinación tipo + ámbito + etiqueta.
    $nids = \Drupal::entityQuery('node')
      ->condition('type', 'informe')
      ->condition('field_tipo', $tid_tipo)
      ->condition('field_ambito', $tid_ambito)
      ->condition('field_etiqueta', $tid_etiqueta)
      ->accessCheck(FALSE)
      ->execute();

    if (!empty($nids)) {
      $node = Node::load(reset($nids));
    }
    else {
      $node = Node::create(['type' => 'informe']);
    }

    $titulo = 'Informe ' . $etiqueta . ' — ' . $fecha_snapshot;

    $node->set('title', $titulo);
    $node->set('field_contenido', ['value' => $html, 'format' => 'full_html']);
    $node->set('field_etiqueta', ['target_id' => $tid_etiqueta]);
    $node->set('field_ambito',   ['target_id' => $tid_ambito]);
    $node->set('field_tipo',     ['target_id' => $tid_tipo]);
    $node->set('status', 1);
    $node->save();

    return new JsonResponse([
      'nid'    => $node->id(),
      'titulo' => $node->getTitle(),
    ]);
  }

  /**
   * Genera el PDF de un informe y lo adjunta como Media al nodo.
   */
  public function generarPdf(int $nid): JsonResponse {
    $node = Node::load($nid);
    if (!$node || $node->bundle() !== 'informe') {
      return new JsonResponse(['error' => 'Informe no encontrado'], 404);
    }

    $html     = $node->get('field_contenido')->value;
    $filename = 'informe-' . $node->id() . '.pdf';

    // Inyecta informe-print.css inline para que WeasyPrint no tenga que
    // resolverlo por URL (evita el bug border-collapse en producción).
    $module_path = \Drupal::service('extension.list.module')->getPath('visor');
    $print_css_path = $module_path . '/css/informe-print.css';
    if (file_exists($print_css_path)) {
      $print_css = file_get_contents($print_css_path);
      $html = str_replace('</head>', '<style>' . $print_css . '</style></head>', $html);
    }

    try {
      $response = \Drupal::httpClient()->post('http://host.docker.internal:8081/pdf', [
        'json' => [
          'html'     => $html,
          'base_url' => 'https://vtp.carlosespino.es',
          'filename' => $filename,
        ],
        'timeout' => 60,
      ]);

      $pdf_bytes = $response->getBody()->getContents();
    }
    catch (\GuzzleHttp\Exception\ClientException $e) {
      $body = $e->getResponse() ? $e->getResponse()->getBody()->getContents() : '';
      return new JsonResponse(['error' => 'WeasyPrint 4xx: ' . $e->getMessage(), 'detail' => $body], 500);
    }
    catch (\GuzzleHttp\Exception\ServerException $e) {
      $body = $e->getResponse() ? $e->getResponse()->getBody()->getContents() : '';
      return new JsonResponse(['error' => 'WeasyPrint 5xx: ' . $e->getMessage(), 'detail' => $body], 500);
    }
    catch (\Exception $e) {
      return new JsonResponse(['error' => 'WeasyPrint: ' . $e->getMessage()], 500);
    }

    // Guarda el fichero en public://informes/.
    $dir = 'public://informes';
    \Drupal::service('file_system')->prepareDirectory(
      $dir,
      FileSystemInterface::CREATE_DIRECTORY | FileSystemInterface::MODIFY_PERMISSIONS
    );

    $file = \Drupal::service('file.repository')->writeData(
      $pdf_bytes,
      $dir . '/' . $filename,
      FileSystemInterface::EXISTS_REPLACE
    );

    // Crea la entidad Media de tipo documento.
    $media = Media::create([
      'bundle'               => 'document',
      'name'                 => $node->getTitle() . '.pdf',
      'field_media_document' => ['target_id' => $file->id()],
      'status'               => 1,
    ]);
    $media->save();

    // Adjunta el Media al nodo.
    $node->set('field_pdf', ['target_id' => $media->id()]);
    $node->save();

    return new JsonResponse([
      'nid'      => $node->id(),
      'media_id' => $media->id(),
    ]);
  }

  /**
   * Sirve el HTML del informe directamente como página, sin envoltorio Drupal.
   * Permite previsualizar en pantalla cómo quedará el PDF, aprovechando las
   * reglas @media screen de informe-print.css.
   */
  public function preview(int $nid): Response {
    $node = Node::load($nid);
    if (!$node || $node->bundle() !== 'informe') {
      throw new NotFoundHttpException();
    }

    $html = $node->get('field_contenido')->value;

    if (!$html) {
      throw new NotFoundHttpException();
    }

    return new Response($html, 200, ['Content-Type' => 'text/html; charset=UTF-8']);
  }

  /**
   * Carga un bloque_de_texto por nid o field_id_alternativo, aplica
   * sustituciones de variables con los datos recibidos y devuelve el HTML.
   *
   * Payload JSON esperado:
   *   datos  object  Registro activo del visor (snapshot)
   *
   * Sintaxis de sustitución en el cuerpo del nodo:
   *   {{ campo }}             → valor sin formato (número: 2 decimales o 0 si entero)
   *   {{ campo | decimal_2 }} → valor con formato explícito
   */
  public function resolverTexto(string $id, Request $request): JsonResponse {
    if (is_numeric($id)) {
      $node = Node::load((int) $id);
    }
    else {
      $nids = \Drupal::entityQuery('node')
        ->condition('type', 'bloque_de_texto')
        ->condition('field_id_alternativo', $id)
        ->accessCheck(FALSE)
        ->execute();
      $node = !empty($nids) ? Node::load(reset($nids)) : NULL;
    }

    if (!$node || $node->bundle() !== 'bloque_de_texto') {
      return new JsonResponse(['error' => 'Bloque no encontrado: ' . $id], 404);
    }

    $data  = json_decode($request->getContent(), TRUE);
    $datos = $data['datos'] ?? [];
    $extra = $data['extra'] ?? [];

    $html = $node->get('field_contenido')->value ?? '';
    $html = $this->aplicarSustituciones($html, $datos, $extra);

    $response = new JsonResponse(['html' => $html]);
    $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return $response;
  }

  /**
   * Sustituye variables de texto con soporte de contexto (período, entidad)
   * y expresiones aritméticas.
   *
   * Sintaxis:
   *   {{ campo }}                          campo del registro actual, auto-formato
   *   {{ campo | formato }}                campo con formato explícito
   *   {{ campo | p:anterior }}             período anterior para el mismo registro
   *   {{ campo | p:YYYY-MM-DD }}           fecha específica
   *   {{ campo | e:NombreEntidad }}        otra entidad, período actual
   *   {{ campo | p:anterior | e:Nombre }}  otra entidad, período anterior
   *   [[ expr | formato ]]                 expresión aritmética formateada
   *     donde expr puede contener {{ campo | opts }} más operadores + - * / ()
   *     Ejemplo: [[ {{ rit }} - {{ rit | p:anterior }} | decimal_2 ]]
   */
  private function aplicarSustituciones(string $texto, array $datos, array $extra = []): string {

    // ── Carga diferida de los JSON del visor ──────────────────────────────
    $cache = [];
    $cargar = function (string $nombre) use (&$cache): array {
      if (!array_key_exists($nombre, $cache)) {
        $base = \Drupal::service('file_system')->realpath('public://visor');
        $ruta = $base . '/' . $nombre;
        $cache[$nombre] = file_exists($ruta)
          ? (json_decode(file_get_contents($ruta), TRUE) ?? [])
          : [];
      }
      return $cache[$nombre];
    };

    // ── Parser de opciones ────────────────────────────────────────────────
    // Convierte " | decimal_2 | p:anterior | e:Lanzarote"
    // en       ['formato' => 'decimal_2', 'p' => 'anterior', 'e' => 'Lanzarote']
    $parsearOpts = static function (string $raw): array {
      $opts = [];
      foreach (array_filter(array_map('trim', explode('|', $raw))) as $parte) {
        if (str_starts_with($parte, 'p:')) {
          $opts['p'] = trim(substr($parte, 2));
        }
        elseif (str_starts_with($parte, 'e:')) {
          $opts['e'] = trim(substr($parte, 2));
        }
        elseif (str_starts_with($parte, 'y:')) {
          $opts['y'] = trim(substr($parte, 2));
        }
        elseif ($parte !== '') {
          $opts['formato'] = $parte;
        }
      }
      return $opts;
    };

    // ── Resolución de un campo según contexto ────────────────────────────
    $resolverCampo = function (string $campo, array $opts) use ($datos, $extra, $cargar): mixed {
      $periodo  = $opts['p'] ?? NULL;
      $etiqueta = $opts['e'] ?? NULL;

      // Caso 0: notación de punto → dataset extra (p.ej. "viviendas_terminadas.2024").
      if (str_contains($campo, '.')) {
        [$dataset, $clave] = explode('.', $campo, 2);
        if (!isset($extra[$dataset])) return NULL;
        $ds = $extra[$dataset];

        // Array de objetos (claves numéricas): buscar el registro que coincide
        // con la entidad activa según ambito + isla_id / municipio_id.
        // Si hay e:NombreEntidad se usa esa entidad en lugar de la activa.
        if (array_is_list($ds) && !empty($ds) && is_array($ds[0])) {
          $entidadRef = $datos;
          if ($etiqueta !== NULL) {
            foreach ($cargar('datos_dashboard.json') as $reg) {
              if (($reg['etiqueta'] ?? NULL) === $etiqueta) {
                $entidadRef = $reg;
                break;
              }
            }
          }
          $ambito       = $entidadRef['ambito']       ?? NULL;
          $isla_id      = (string) ($entidadRef['isla_id']      ?? '');
          $municipio_id = (string) ($entidadRef['municipio_id'] ?? '');
          $yearFilter = isset($opts['y']) ? (string) $opts['y'] : NULL;
          $candidatos = [];
          foreach ($ds as $record) {
            if (($record['ambito'] ?? NULL) !== $ambito) continue;
            if ($ambito === 'isla'      && (string) ($record['isla_id']      ?? '') !== $isla_id) continue;
            if ($ambito === 'municipio' && (string) ($record['municipio_id'] ?? '') !== $municipio_id) continue;
            if ($yearFilter !== NULL) {
              $recordYear = (string) ($record['year'] ?? $record['ejercicio'] ?? '');
              if ($recordYear !== $yearFilter) continue;
              return $record[$clave] ?? NULL;
            }
            $candidatos[] = $record;
          }
          // Sin filtro de año: devolver el registro con el año más reciente.
          if (empty($candidatos)) return NULL;
          if (count($candidatos) > 1) {
            usort($candidatos, function ($a, $b) {
              $ya = (int) ($a['year'] ?? $a['ejercicio'] ?? 0);
              $yb = (int) ($b['year'] ?? $b['ejercicio'] ?? 0);
              return $yb - $ya;
            });
          }
          return $candidatos[0][$clave] ?? NULL;
        }

        // Key-value simple (comportamiento original).
        return $ds[$clave] ?? NULL;
      }

      // Caso 1: registro activo, período actual (comportamiento original).
      if ($periodo === NULL && $etiqueta === NULL) {
        return $datos[$campo] ?? NULL;
      }

      // Caso 2: otra entidad, período actual → snapshot.
      if ($periodo === NULL) {
        foreach ($cargar('datos_dashboard.json') as $reg) {
          if (($reg['etiqueta'] ?? NULL) === $etiqueta) {
            return $reg[$campo] ?? NULL;
          }
        }
        return NULL;
      }

      // Casos 3 y 4: necesitamos series históricas.
      $buscEtiq = $etiqueta ?? ($datos['etiqueta'] ?? NULL);
      $fechaRef  = $datos['fecha_calculo'] ?? NULL;

      $serie = array_values(array_filter(
        $cargar('series.json'),
        static fn($r) => ($r['etiqueta'] ?? NULL) === $buscEtiq,
      ));

      if (empty($serie)) {
        return NULL;
      }

      // Ordenar por fecha descendente.
      usort($serie, static fn($a, $b) =>
        strcmp($b['fecha_calculo'] ?? '', $a['fecha_calculo'] ?? ''),
      );

      if ($periodo === 'anterior') {
        // Período más reciente estrictamente anterior a la fecha de referencia.
        foreach ($serie as $reg) {
          if ($fechaRef === NULL || ($reg['fecha_calculo'] ?? '') < $fechaRef) {
            return $reg[$campo] ?? NULL;
          }
        }
        return NULL;
      }

      // Fecha específica.
      foreach ($serie as $reg) {
        if (($reg['fecha_calculo'] ?? '') === $periodo) {
          return $reg[$campo] ?? NULL;
        }
      }

      return NULL;
    };

    // ── PASO 0: Condicionales  {% if campo op valor %}...{% endif %} ────────
    // Se procesan antes que las variables para que el contenido de cada rama
    // pase luego por los pasos 1 y 2 con normalidad.
    //
    // Soporta: if / elseif / else / endif
    // Los paréntesis opcionales alrededor de la condición se ignoran.
    // Ambos lados del operador pueden ser campos, datasets o literales.
    // Operadores: == != > < >= <=
    // Ejemplos:
    //   {% if ambito == 'canarias' %}...{% endif %}
    //   {% if( personas_hogar.miembros | y:2021 > personas_hogar.miembros | y:2011 ) %}...{% elseif(...) %}...{% else %}...{% endif %}

    // ── Evaluador de una condición individual ────────────────────────────
    $evaluarCondicion = function (string $raw) use ($resolverCampo, $parsearOpts): bool {
      $cond = trim(html_entity_decode($raw, ENT_QUOTES | ENT_HTML5));
      // Quitar paréntesis envolventes opcionales
      if (str_starts_with($cond, '(') && str_ends_with($cond, ')')) {
        $cond = trim(substr($cond, 1, -1));
      }

      // Patrón: [lado_izq]  operador  [lado_der]
      // Cada lado: campo.sub [| opt:val ...], o literal entre comillas, o número.
      $ladoPattern = '[\w.]+(?:\s*\|\s*[\w:]+)*|\'[^\']*\'|"[^"]*"|\S+';
      if (!preg_match(
        '/^(' . $ladoPattern . ')\s*(==|!=|>=|<=|>|<)\s*(' . $ladoPattern . ')$/',
        $cond, $p
      )) {
        return FALSE;
      }

      // Resolver un lado: campo con opts → valor, o literal → string tal cual
      $resolverLado = function (string $lado) use ($resolverCampo, $parsearOpts): mixed {
        $lado = trim($lado);
        // Literal entre comillas → devolver sin comillas
        if (preg_match('/^[\'"](.+)[\'"]$/', $lado, $q)) return $q[1];
        // Número puro → devolver como string
        if (is_numeric($lado)) return $lado;
        // Campo [| opts] → resolver
        $segs  = preg_split('/\s*\|\s*/', $lado, 2);
        $campo = trim($segs[0]);
        $opts  = $parsearOpts(isset($segs[1]) ? '| ' . $segs[1] : '');
        return $resolverCampo($campo, $opts) ?? '';
      };

      $izq = $resolverLado($p[1]);
      $der = $resolverLado($p[3]);
      $op  = $p[2];


      return match ($op) {
        '=='    => (string) $izq === (string) $der,
        '!='    => (string) $izq !== (string) $der,
        '>'     => is_numeric($izq) && is_numeric($der) && (float) $izq >  (float) $der,
        '<'     => is_numeric($izq) && is_numeric($der) && (float) $izq <  (float) $der,
        '>='    => is_numeric($izq) && is_numeric($der) && (float) $izq >= (float) $der,
        '<='    => is_numeric($izq) && is_numeric($der) && (float) $izq <= (float) $der,
        default => FALSE,
      };
    };

    // Normalizar entidades HTML dentro de los tags {% %} (el WYSIWYG convierte
    // los espacios a &nbsp; y > a &gt; dentro de las condiciones).
    $texto = preg_replace_callback(
      '/\{%.*?%\}/s',
      fn($m) => html_entity_decode($m[0], ENT_QUOTES | ENT_HTML5, 'UTF-8'),
      $texto,
    );

    // ── Procesado de bloques if/elseif/else/endif ────────────────────────
    $texto = preg_replace_callback(
      '/\{%\s*if\b[^%]*%\}.*?\{%\s*endif\s*%\}/s',
      function (array $m) use ($evaluarCondicion): string {
        $bloque = $m[0];

        // Extraer la condición del {% if ... %}
        if (!preg_match('/^\{%\s*if\b[^%]*%\}/', $bloque, $tagIf)) return '';
        preg_match('/^\{%\s*if\b\s*(.*?)\s*%\}/s', $bloque, $condIf);
        $condPrimera = trim($condIf[1] ?? '');

        // Cuerpo entre {% if %} y {% endif %}, sin el tag de apertura
        $cuerpo = substr($bloque, strlen($tagIf[0]));
        $cuerpo = preg_replace('/\{%\s*endif\s*%\}\s*$/', '', $cuerpo);

        // Normalizar {% else %} a un marcador antes de dividir, para evitar
        // el comportamiento indefinido de grupos no participantes en preg_split.
        $sentinel = '__ELSE__';
        $cuerpo   = preg_replace('/\{%\s*else\s*%\}/s', "{% elseif {$sentinel} %}", $cuerpo);

        // Dividir en ramas sobre {% elseif ... %} con PREG_SPLIT_DELIM_CAPTURE
        $partes = preg_split(
          '/\{%\s*elseif\b\s*(.*?)\s*%\}/s',
          $cuerpo,
          -1,
          PREG_SPLIT_DELIM_CAPTURE
        );

        // Construir lista de ramas: [ [condicion, cuerpo], ... ]
        // partes[0]           = cuerpo de la rama if
        // partes[1], [3], ... = condición del elseif (__ELSE__ para rama else)
        // partes[2], [4], ... = cuerpo de cada rama
        $ramas = [[$condPrimera, $partes[0]]];
        for ($i = 1, $n = count($partes); $i < $n; $i += 2) {
          $cond = trim($partes[$i] ?? '');
          $ramas[] = [$cond === $sentinel ? '' : $cond, $partes[$i + 1] ?? ''];
        }

        foreach ($ramas as [$cond, $rama]) {
          if ($cond === '') return $rama;           // else
          if ($evaluarCondicion($cond)) return $rama;
        }
        return '';
      },
      $texto,
    );

    // ── PASO 1: Expresiones aritméticas  [[ expr | formato ]] ─────────────
    // Se procesan primero para que las {{ }} internas estén todavía sin resolver.
    $texto = preg_replace_callback(
      '/\[\[((?:(?!\]\]).)*)\]\]/s',
      function (array $m) use ($parsearOpts, $resolverCampo): string {
        // Normalizar entidades HTML (el WYSIWYG inserta &nbsp; entre tokens)
        // y espacios no estándar que rompen la regex de seguridad.
        $contenido = html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $contenido = preg_replace('/\xc2\xa0/', ' ', $contenido);
        $formato   = 'decimal_2';

        // Extraer formato si el último token tras | no es una opción de contexto.
        if (preg_match('/^(.*)\|\s*([\w_]+)\s*$/s', $contenido, $partes)
            && !str_starts_with(trim($partes[2]), 'p:')
            && !str_starts_with(trim($partes[2]), 'e:')
        ) {
          $contenido = $partes[1];
          $formato   = trim($partes[2]);
        }

        // Resolver {{ campo | opts }} → valor numérico sin formato.
        $exprNum = preg_replace_callback(
          '/\{\{\s*([\w.]+)((?:\s*\|\s*(?:[^{}|]+))*)\s*\}\}/',
          static function (array $inner) use ($parsearOpts, $resolverCampo): string {
            $val = $resolverCampo($inner[1], $parsearOpts($inner[2] ?? ''));
            return is_numeric($val) ? (string)(float) $val : '0';
          },
          $contenido,
        );

        // Seguridad: la expresión solo puede contener números y operadores.
        $exprNum = trim($exprNum);
        if (!preg_match('/^[\d\s.\+\-\*\/\(\)]+$/', $exprNum) || $exprNum === '') {
          return '';
        }

        try {
          // phpcs:ignore Drupal.Functions.DiscouragedFunctions
          $resultado = eval('return ' . $exprNum . ';');
        }
        catch (\Throwable) {
          return '';
        }

        return is_numeric($resultado)
          ? $this->formatearValor((float) $resultado, $formato)
          : '';
      },
      $texto,
    );

    // ── PASO 2: Referencias simples/contextuales  {{ campo | opts }} ──────
    $texto = preg_replace_callback(
      '/\{\{\s*([\w.]+)((?:\s*\|\s*(?:[^{}|]+))*)\s*\}\}/',
      function (array $m) use ($parsearOpts, $resolverCampo): string {
        $campo = $m[1];
        $opts  = $parsearOpts($m[2] ?? '');
        $valor = $resolverCampo($campo, $opts);

        if ($valor === NULL || $valor === '') {
          return '';
        }

        return $this->formatearValor($valor, $opts['formato'] ?? '');
      },
      $texto,
    );

    return $texto;
  }

  /**
   * Formatea un valor numérico o de cadena según el formato indicado.
   *
   * Formatos soportados: entero, decimal_0/1/2, porcentaje_0/1/2.
   * Sin formato: entero si el valor es entero, 2 decimales si no lo es.
   */
  private function formatearValor(mixed $valor, string $formato): string {
    if (!is_numeric($valor)) {
      return (string) $valor;
    }

    $num = (float) $valor;

    return match ($formato) {
      'entero'       => number_format($num, 0, ',', '.'),
      'decimal_0'    => number_format($num, 0, ',', '.'),
      'decimal_1'    => number_format($num, 1, ',', '.'),
      'decimal_2'    => number_format($num, 2, ',', '.'),
      'porcentaje_0' => number_format($num, 0, ',', '.') . '%',
      'porcentaje_1' => number_format($num, 1, ',', '.') . '%',
      'porcentaje_2' => number_format($num, 2, ',', '.') . '%',
      default        => number_format($num, floor($num) == $num ? 0 : 2, ',', '.'),
    };
  }

  /**
   * Devuelve el ID de un término de taxonomía, creándolo si no existe.
   */
  private function obtenerOCrearTermino(string $nombre, string $vocabulario): int {
    $terms = \Drupal::entityTypeManager()
      ->getStorage('taxonomy_term')
      ->loadByProperties(['name' => $nombre, 'vid' => $vocabulario]);

    if (!empty($terms)) {
      return (int) reset($terms)->id();
    }

    $term = Term::create(['vid' => $vocabulario, 'name' => $nombre]);
    $term->save();
    return (int) $term->id();
  }

}
