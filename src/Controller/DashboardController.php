<?php

declare(strict_types=1);

namespace Drupal\visor\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Database\Database;
use Drupal\Core\Session\AccountInterface;

/**
 * Returns responses for visor routes.
 */
final class DashboardController extends ControllerBase {

  /**
   * Builds the response.
   */
  public function __invoke(): array {

    // Obtenemos los datos para el dashboard, referidos siempre al último snapshot
    $ruta_json = 'public://visor/datos_dashboard.json';
    $datos_dashboard = [];

    if (file_exists($ruta_json)) {
      $contenido = file_get_contents($ruta_json);
      $datos_dashboard = json_decode($contenido, TRUE);
    }

    // Obtenemos las series para comparaciones o gráficos temporales
    $ruta_json = 'public://visor/series.json';
    $datos_series = [];

    if (file_exists($ruta_json)) {
      $contenido = file_get_contents($ruta_json);
      $datos_series = json_decode($contenido, TRUE);
    }

    // Obtenemos los datos de las localidades
    $ruta_json = 'public://visor/localidades.json';
    $datos_localidades = [];

    if (file_exists($ruta_json)) {
      $contenido = file_get_contents($ruta_json);
      $datos_localidades = json_decode($contenido, TRUE);
    }

    // DATOS COMPLEMENTARIOS
    //======================

    // Obtenemos los datos de vivienda terminada
    $viviendas_terminadas = $this->getViviendasTerminadas();

    // Obtenemos los datos de poblacion 2021 (coincide con el último censo de viviendas)
    $poblacion_2021 = $this->getPoblacion2021();

    

    // Obtenemos las siluetas
    $ruta_json_imagenes = 'public://assets/siluetas.json';
    $imagenes_json = [];
    if (file_exists($ruta_json_imagenes)) {
      $contenido_imagenes = file_get_contents($ruta_json_imagenes);
      $imagenes_json = json_decode($contenido_imagenes, TRUE);
    }

    // Obtenemos los nombres de las siluetas
    $nombres_siluetas = $this->getNombreSiluetas();
    $nombres_siluetas['isla_1'] = 'el-hierro';
    $nombres_siluetas['isla_2'] = 'fuerteventura';
    $nombres_siluetas['isla_3'] = 'gran-canaria';
    $nombres_siluetas['isla_4'] = 'la-gomera';
    $nombres_siluetas['isla_5'] = 'la-palma';
    $nombres_siluetas['isla_6'] = 'lanzarote';
    $nombres_siluetas['isla_7'] = 'tenerife';
    $nombres_siluetas['canarias'] = 'canarias';

    // Obtenemos los nombres y etiquetas de los indicadores del select
    $indicadores_visualizables = $this->getIndicadoresVisualizables();

    // Obtenemos el diccionario de datos
    $diccionario = $this->getDiccionarioDeDatos();

    $is_admin = $this->currentUser()->hasRole('administrator');

    return [
      '#theme' => 'visor_dashboard',
      '#indicadores_visualizables' => $indicadores_visualizables,
      '#is_admin' => $is_admin,
      '#attached' => [
        'library' => [
          'visor/visor_dashboard',
        ],
        'drupalSettings' => [
          'visorProject' => [
            'datosDashboard' => $datos_dashboard,
            'datosSeries' => $datos_series,
            'datosLocalidades' => $datos_localidades,
            'siluetas' => $imagenes_json,
            'nombres_siluetas' => $nombres_siluetas,
            'diccionario' => $diccionario,
            '$viviendas_terminadas' => $viviendas_terminadas,
            '$poblacion_2021' => $poblacion_2021
          ],
        ],
      ],
    ];

  }

  public function getPoblacion2021(){
    $conn = Database::getConnection('default', 'mapa_data');
    $results = $conn->select('poblacion', 'h')
      ->fields('h')
      ->condition('year', 2021)
      ->execute()
      ->fetchAll();

    // Organizamos el array para que el JS lo encuentre rápido
    $dataset = [];
    foreach ($results as $row) {
      $dataset[] = [
        'poblacion' => $row->valor,
        'ambito' => $row->ambito,
        'isla_id' => $row->isla_id,
        'municipio_id' => $row->municipio_id,
      ];
      
    }
    return $dataset;
  }

  public function getViviendasTerminadas(){
    $conn = Database::getConnection('default', 'mapa_data');
    
    // Traemos toda la vista que creamos en Postgres
    $results = $conn->select('vivienda_iniciada_terminada_canarias', 'h')                                                                                                                    
      ->fields('h', ['year', 'viviendas_terminadas'])                                                                                                                                        
      ->condition('tipo_periodo', 'anual')                    
      ->condition('territorio_codigo', 'ES70')                                                                                                                                               
      ->condition('year', 2020, '>')
      ->orderBy('year', 'ASC')                                                                                                                                                               
      ->execute()                                                                                                                                                                            
      ->fetchAll();


    // Organizamos el array para que el JS lo encuentre rápido
    $dataset = [];
    foreach ($results as $row) {
      $key = $row->year;
      $dataset[$key] = $row->viviendas_terminadas;
    }

    $query = $conn->select('vivienda_iniciada_terminada_canarias', 'h')
      ->condition('territorio_codigo', 'ES70')
      ->condition('tipo_periodo', 'anual')                                                                                                                                                   
      ->condition('year', 2020, '>');
    $query->addExpression('SUM(viviendas_terminadas)', 'total_terminadas');                                                                                                                  
                                                                                                                                                                                             
    //~ $total = $query->execute()->fetchField();
    $dataset['total'] = $query->execute()->fetchField();
    
    return $dataset;
  }


  public function getNombreSiluetas() {
    $conn = Database::getConnection('default', 'mapa_data');
    
    // Traemos toda la vista que creamos en Postgres
    $results = $conn->select('municipios', 'h')
      ->fields('h')
      ->execute()
      ->fetchAll();

    // Organizamos el array para que el JS lo encuentre rápido
    $dataset = [];
    foreach ($results as $row) {
      $key = 'muni_' . $row->id;
      $dataset[$key] = $row->nombre;
    }
    return $dataset;
  }

  public function getIndicadoresVisualizables() {
    $conn = Database::getConnection('default', 'mapa_data');
    $query = $conn->select('diccionario_de_datos', 'd')
      ->fields('d', ['id_campo', 'etiqueta'])
      ->condition('visualizable', 1)
      ->orderBy('etiqueta', 'ASC');
    $results = $query->execute()->fetchAll();
    $options = [];
    foreach ($results as $record) {
        $options[$record->id_campo] = $record->etiqueta;
    }
    return $options;
  }

  public function getDiccionarioDeDatos() {
    $conn = Database::getConnection('default', 'mapa_data');
    $query = $conn->select('diccionario_de_datos', 'd')
      ->fields('d');
    $results = $query->execute()->fetchAll();
    $options = [];
    foreach ($results as $record) {
        $options[$record->id_campo] = $record;
    }
    return $options;
  }


  

}
