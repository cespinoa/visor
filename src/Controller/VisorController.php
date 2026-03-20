<?php

declare(strict_types=1);

namespace Drupal\visor\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Database\Database;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Returns responses for visor routes.
 */
final class VisorController extends ControllerBase {

  /**
   * Builds the response.
   */
  public function __invoke(): array {

    $datosHistoricos = $this->getTodoElHistorico();
    $superTabla = $this->cargarSuperTabla();
    

    return [
      '#theme' => 'visor_mapa_template',
      '#attached' => [
        'library' => [
          'visor/mapa_view',
        ],
        'drupalSettings' => [
          'historicosFull' => $datosHistoricos,
          'superTabla' => $superTabla
        ],
      ],
    ];

  }

  public function cargarSuperTabla() {
    $conn = Database::getConnection('default', 'mapa_data');
    $query = $conn->select('v_main_map', 'm');
    
    $query->fields('m', ['id', 'etiqueta', 'ambito', 'rit', 'ph_km2', 'isla_nombre_ref','vv_total']);
    
    //~ // Reemplazamos ST_Width(geom) por (ST_XMax(geom) - ST_XMin(geom))
    //~ // Reemplazamos ST_Height(geom) por (ST_YMax(geom) - ST_YMin(geom))
   //~ $svg_expression = "ST_AsSVG(
      //~ ST_Translate(
          //~ ST_Scale(
              //~ ST_Translate(geom, -ST_XMin(geom), -ST_YMin(geom)),
              //~ 100 / NULLIF(GREATEST(ST_XMax(geom) - ST_XMin(geom), ST_YMax(geom) - ST_YMin(geom)), 0),
              //~ -100 / NULLIF(GREATEST(ST_XMax(geom) - ST_XMin(geom), ST_YMax(geom) - ST_YMin(geom)), 0)
          //~ ),
          //~ 0, 100
      //~ )
  //~ )";
    
    //~ $query->addExpression($svg_expression, 'svg_path');

    try {
      $results = $query->execute()->fetchAll();
    } catch (\Exception $e) {
      \Drupal::logger('visor_vv')->error($e->getMessage());
      return [];
    }

    $ranking = [];
    foreach ($results as $row) {
      $etiqueta = $row->etiqueta;
      if ($row->ambito === 'municipio') {
        $etiqueta = "$etiqueta ($row->isla_nombre_ref)";
      }

      $ranking[] = [
        'id'       => $row->id,
        'etiqueta' => $etiqueta,
        'ambito'   => $row->ambito,
        'rit'      => (float) $row->rit,
        'ph_km2'   => (float) $row->ph_km2,
        'vv_total' => $row->vv_total,
        //~ 'svg_path' => $row->svg_path,
      ];
    }
    
    return $ranking;
  }

  public function getTodoElHistorico() {
    $conn = Database::getConnection('default', 'mapa_data');
    
    // Traemos toda la vista que creamos en Postgres
    $results = $conn->select('v_frontend_evolucion_vv', 'h')
      ->fields('h')
      ->orderBy('fecha_calculo', 'ASC')
      ->execute()
      ->fetchAll();

    // Organizamos el array para que el JS lo encuentre rápido
    $dataset = [];
    foreach ($results as $row) {
      $key = $row->ambito . '_' . ($row->ambito == 'canarias' ? '0' : ($row->isla_id ?: $row->municipio_id));
      $dataset[$key][] = [
        'x' => $row->fecha_calculo,
        'y' => (int) $row->vv_total,
        'label' => $row->etiqueta
      ];
    }
    return $dataset;
  }

}
