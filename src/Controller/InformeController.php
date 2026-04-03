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
    $print_css_path = $module_path . '/css/dashboard/informe-print.css';
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
