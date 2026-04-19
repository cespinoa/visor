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

    // Obtenemos el histórico de vivienda terminada
    $historico_viviendas_terminadas = $this->getHistoricoViviendasTerminadas();

    // Obtenemos los datos de tamaño del hogar a partir de 1981
    $personas_hogar = $this->getPersonasHogar();

    // Obtenemos los datos de llegada de turistas
    $historicoLlegadas = $this->getHistoricoLlegadas();

    // Obtenemos el histórico de plazas
    $historicoPlazasRegladas = $this->getHistoricoPlazasRegladas();

    // Obtenemos el histórico de ocupacion
    $historicoTasaOcupacion = $this->getHistoricoTasaOcupacion();

    // Obtenemos el histórico de tamño de hogar por CCAA
    $historico_personas_hogar_ccaa = $this->getHistoricoPersonasHogarCCAA();

    // Obtenemos el histórico de población
    $historico_poblacion = $this->getHistoricoPoblacion();

    // Obtenemos los censos de viviendas no habituales
    $censo_viviendas_no_habituales = $this->getCensoViviendasNoHabituales();

    // Obtenemos el histórico de estancia media en alojamiento reglado
    $historico_estancia_media = $this->getHistoricoEstanciaMedia();

    // Obtenemos la composición de hogares por tipo (ECH)
    $ech_hogares_tipo_agrupada = $this->getEchHogaresTipoAgrupada();
    $ech_hogares_tipo_variacion = $this->getEchHogaresTipoVariacion($ech_hogares_tipo_agrupada);

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
            '$poblacion_2021' => $poblacion_2021,
            '$personas_hogar' => $personas_hogar,
            '$historicoLlegadas' => $historicoLlegadas,
            '$historicoPlazasRegladas' => $historicoPlazasRegladas,
            '$historicoTasaOcupacion' => $historicoTasaOcupacion,
            '$historico_personas_hogar_ccaa' => $historico_personas_hogar_ccaa,
            '$historico_viviendas_terminadas' => $historico_viviendas_terminadas,
            '$historico_poblacion' => $historico_poblacion,
            '$censo_viviendas_no_habituales' => $censo_viviendas_no_habituales,
            '$historico_estancia_media' => $historico_estancia_media,
            '$ech_hogares_tipo_agrupada' => $ech_hogares_tipo_agrupada,
            '$ech_hogares_tipo_variacion' => $ech_hogares_tipo_variacion,
          ],
        ],
      ],
    ];

  }

  public function getCensoViviendasNoHabituales(): array {
    $conn = Database::getConnection('default', 'mapa_data');

    $rows = $conn->select('viviendas_no_habituales_censos', 'h')
      ->fields('h')
      ->execute()
      ->fetchAll();

    // Mapa id(municipio) → isla_id para poder agregar por isla
    // En la tabla municipios el PK se llama 'id', no 'municipio_id'
    $muni2isla = $conn->select('municipios', 'm')
      ->fields('m', ['id', 'isla_id'])
      ->execute()
      ->fetchAllKeyed(); // [id => isla_id]

    $dataset  = [];
    $porIsla  = [];
    $canarias = [
      'no_hab_2001' => 0, 'no_hab_2011' => 0, 'no_hab_2021' => 0,
      'hab_2001'    => 0, 'hab_2011'    => 0, 'hab_2021'    => 0,
      'total_2001'  => 0, 'total_2011'  => 0, 'total_2021'  => 0,
    ];

    foreach ($rows as $row) {
      $islaId = $muni2isla[$row->municipio_id] ?? NULL;
      $v2001  = (int) $row->no_hab_2001;
      $v2011  = (int) $row->no_hab_2011;
      $v2021  = (int) $row->no_hab_2021;
      $h2001  = (int) $row->hab_2001;
      $h2011  = (int) $row->hab_2011;
      $h2021  = (int) $row->hab_2021;
      $t2001  = (int) $row->total_2001;
      $t2011  = (int) $row->total_2011;
      $t2021  = (int) $row->total_2021;

      $dataset[] = [
        'ambito'       => 'municipio',
        'municipio_id' => (int) $row->municipio_id,
        'isla_id'      => $islaId ? (int) $islaId : NULL,
        'no_hab_2001'  => $v2001,
        'no_hab_2011'  => $v2011,
        'no_hab_2021'  => $v2021,
        'hab_2001'     => $h2001,
        'hab_2011'     => $h2011,
        'hab_2021'     => $h2021,
        'total_2001'   => $t2001,
        'total_2011'   => $t2011,
        'total_2021'   => $t2021,
      ] + $this->indicesBase100($v2001, $v2011, $v2021)
        + $this->porcentajesCensos($v2001, $v2011, $v2021, $h2001, $h2011, $h2021, $t2001, $t2011, $t2021);

      if ($islaId) {
        foreach (['no_hab_2001', 'no_hab_2011', 'no_hab_2021', 'hab_2001', 'hab_2011', 'hab_2021', 'total_2001', 'total_2011', 'total_2021'] as $f) {
          $porIsla[$islaId][$f] = ($porIsla[$islaId][$f] ?? 0) + (int) $row->$f;
        }
      }
      foreach (['no_hab_2001', 'no_hab_2011', 'no_hab_2021', 'hab_2001', 'hab_2011', 'hab_2021', 'total_2001', 'total_2011', 'total_2021'] as $f) {
        $canarias[$f] += (int) $row->$f;
      }
    }

    foreach ($porIsla as $islaId => $s) {
      $dataset[] = [
        'ambito'  => 'isla',
        'isla_id' => (int) $islaId,
      ] + $s
        + $this->indicesBase100($s['no_hab_2001'], $s['no_hab_2011'], $s['no_hab_2021'])
        + $this->porcentajesCensos($s['no_hab_2001'], $s['no_hab_2011'], $s['no_hab_2021'], $s['hab_2001'], $s['hab_2011'], $s['hab_2021'], $s['total_2001'], $s['total_2011'], $s['total_2021']);
    }

    $c = $canarias;
    $dataset[] = ['ambito' => 'canarias']
      + $c
      + $this->indicesBase100($c['no_hab_2001'], $c['no_hab_2011'], $c['no_hab_2021'])
      + $this->porcentajesCensos($c['no_hab_2001'], $c['no_hab_2011'], $c['no_hab_2021'], $c['hab_2001'], $c['hab_2011'], $c['hab_2021'], $c['total_2001'], $c['total_2011'], $c['total_2021']);

    return $dataset;
  }

  /**
   * Calcula índices base 100 respecto a 2001 para tres censos.
   * Devuelve null en 2011/2021 si el valor base es 0 (evita división por cero).
   */
  private function indicesBase100(int $v2001, int $v2011, int $v2021): array {
    $base = $v2001 ?: NULL;
    return [
      'no_hab_2001_idx' => 100.0,
      'no_hab_2011_idx' => $base ? round($v2011 / $base * 100, 1) : NULL,
      'no_hab_2021_idx' => $base ? round($v2021 / $base * 100, 1) : NULL,
    ];
  }

  /**
   * Calcula el porcentaje de viviendas no habituales y habituales sobre el total
   * para cada uno de los tres censos. Devuelve null si el total es 0.
   */
  private function porcentajesCensos(
    int $nv2001, int $nv2011, int $nv2021,
    int $h2001,  int $h2011,  int $h2021,
    int $t2001,  int $t2011,  int $t2021
  ): array {
    $p = fn(int $num, int $den) => $den > 0 ? round($num / $den * 100, 1) : NULL;
    return [
      'no_hab_2001_porc' => $p($nv2001, $t2001),
      'no_hab_2011_porc' => $p($nv2011, $t2011),
      'no_hab_2021_porc' => $p($nv2021, $t2021),
      'hab_2001_porc'    => $p($h2001,  $t2001),
      'hab_2011_porc'    => $p($h2011,  $t2011),
      'hab_2021_porc'    => $p($h2021,  $t2021),
    ];
  }


  public function getHistoricoPersonasHogarCCAA() {                                                                                                                                        
      $conn = Database::getConnection('default', 'mapa_data');
      $results = $conn->select('ech_tamano_hogar_ccaa', 'h')                                                                                                                               
          ->fields('h')
          ->condition('trimestre', 4)                                                                                                                                                      
          ->condition('ccaa_nombre', ['Ceuta', 'Melilla'], 'NOT IN')
          ->execute()                                                                                                                                                                      
          ->fetchAll();
                                                                                                                                                                                           
      $dataset = [];                                        
      foreach ($results as $row) {
          $dataset[] = [
              'ccaa_nombre' => $row->ccaa_nombre,
              'miembros'    => $row->miembros,
              'ejercicio' => $row->anyo,
          ];
      }                                                                                                                                                                                    
      return $dataset;                                      
  }



  public function getHistoricoEstanciaMedia(): array {
    $conn = Database::getConnection('default', 'mapa_data');
    $results = $conn->select('historico_estancia_media_reglada', 'h')
      ->fields('h')
      ->condition('ejercicio', 2009, '>')
      ->execute()
      ->fetchAll();

    $dataset = [];
    foreach ($results as $row) {
      $dataset[] = [
        'ejercicio' => $row->ejercicio,
        'ambito'    => $row->ambito,
        'isla_id'   => $row->isla_id,
        'estancia'  => $row->estancia_media,
      ];
    }
    return $dataset;
  }

  public function getHistoricoTasaOcupacion() {
    $conn = Database::getConnection('default', 'mapa_data');
    $results = $conn->select('historico_tasa_ocupacion_reglada', 'h')
      ->fields('h')
      ->condition('ejercicio', 2009, '>')
      ->execute()
      ->fetchAll();

    $dataset = [];
    foreach ($results as $row) {
      $dataset[] = [
        'ejercicio' => $row->ejercicio,
        'ambito' => $row->ambito,
        'isla_id' => $row->isla_id,
        'tasa' => $row->tasa,
      ];
      
    }
    return $dataset;
  }

  public function getHistoricoLlegadas(){
    $conn = Database::getConnection('default', 'mapa_data');
    $query = $conn->select('turistas_llegadas', 'h');
    $query->addField('h', 'isla_id');
    $query->addField('h', 'year');
    $query->addExpression('SUM(turistas)', 'turistas');
    $query->condition('year', 2026, '<');
    $query->groupBy('h.isla_id');
    $query->groupBy('h.year');
    $results = $query->execute()->fetchAll();

    $dataset = [];
    foreach ($results as $row) {
      $dataset[] = [
        'isla_id' => $row->isla_id,
        'year' => $row->year,
        'ambito' => 'isla',
        'turistas' => (int) $row->turistas,
      ];
    }

    // Totalizar Canarias por año
    $totalesPorYear = [];
    foreach ($dataset as $item) {                                                                                                                                                          
      $year = $item['year'];
      $totalesPorYear[$year] = ($totalesPorYear[$year] ?? 0) + $item['turistas'];                                                                                                          
    }                                                       
    foreach ($totalesPorYear as $year => $total) {                                                                                                                                         
      $dataset[] = [
        'isla_id'  => null,                                                                                                                                                                
        'year'     => $year,                                                                                                                                                               
        'ambito'   => 'canarias',
        'turistas' => $total,                                                                                                                                                              
      ];                                                    
    }

    return $dataset;
  }

  public function getHistoricoPlazasRegladas() {
    $conn = Database::getConnection('default', 'mapa_data');
    $results = $conn->select('historico_plazas_regladas', 'h')
      ->fields('h')
      ->condition('ejercicio', 2009, '>')
      ->execute()
      ->fetchAll();

    $dataset = [];
    foreach ($results as $row) {
      $dataset[] = [
        'ejercicio' => $row->ejercicio,
        'ambito' => $row->ambito,
        'isla_id' => $row->isla_id,
        'plazas' => $row->plazas,
      ];
      
    }
    return $dataset;
  }

  public function getPersonasHogar(){
    $conn = Database::getConnection('default', 'mapa_data');
    $results = $conn->select('hogares', 'h')
      ->fields('h')
      ->condition('year', '1980-12-31', '>')
      ->execute()
      ->fetchAll();

    $dataset = [];
    foreach ($results as $row) {
      $dataset[] = [
        'miembros' => $row->miembros,
        'year' => substr($row->year, 0,4),
        'ambito' => $row->ambito,
        'isla_id' => $row->isla_id,
        'municipio_id' => $row->municipio_id,
      ];
      
    }
    return $dataset;
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

  public function getHistoricoViviendasTerminadas(){
    $conn = Database::getConnection('default', 'mapa_data');
    
    // Traemos toda la vista que creamos en Postgres
    $results = $conn->select('vivienda_iniciada_terminada_canarias', 'h')                                                                                                                    
      ->fields('h', ['year', 'viviendas_terminadas'])                                                                                                                                        
      ->condition('tipo_periodo', 'anual')                    
      ->condition('territorio_codigo', 'ES70')                                                                                                                                               
      ->condition('year', 2025, '<')
      ->orderBy('year', 'ASC')                                                                                                                                                               
      ->execute()                                                                                                                                                                            
      ->fetchAll();

    $dataset = [];
    foreach ($results as $row) {
      $key = $row->year;
      $dataset[$key] = $row->viviendas_terminadas;
    }
  
    return $dataset;
  }

  public function getHistoricoPoblacion() {
    $conn = Database::getConnection('default', 'mapa_data');
    
    // Traemos toda la vista que creamos en Postgres
    $results = $conn->select('poblacion', 'h')                                                                                                                    
      ->fields('h')                                                                                                                                        
      ->condition('ambito', 'canarias')                    
      ->condition('year', 2000, '>')                                                                                                                                               
      ->orderBy('year', 'ASC')                                                                                                                                                               
      ->execute()                                                                                                                                                                            
      ->fetchAll();

    $dataset = [];
    foreach ($results as $row) {
      $key = $row->year;
      $dataset[$key] = $row->valor;
    }
  
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

  public function getEchHogaresTipoAgrupada(): array {
    $conn = Database::getConnection('default', 'mapa_data');
    $results = $conn->select('ech_hogares_tipo_agrupada', 'h')
      ->fields('h')
      ->orderBy('anyo', 'ASC')
      ->orderBy('categoria', 'ASC')
      ->execute()
      ->fetchAll();

    $dataset = [];
    foreach ($results as $row) {
      $dataset[] = [
        'anyo'          => (int) $row->anyo,
        'categoria'     => $row->categoria,
        'hogares_miles' => (float) $row->hogares_miles,
      ];
    }
    return $dataset;
  }

  public function getEchHogaresTipoVariacion(array $dataset): array {
    $by_cat = [];
    foreach ($dataset as $row) {
      $by_cat[$row['categoria']][] = $row;
    }

    $claves = [
      'Hogar unipersonal'              => 'unipersonal',
      'Hogares con un núcleo familiar' => 'un_nucleo',
      'Dos o más núcleos familiares'   => 'dos_nucleos',
      'Personas sin núcleo entre sí'   => 'sin_nucleo',
    ];

    $result = [];
    foreach ($by_cat as $categoria => $rows) {
      $clave        = $claves[$categoria] ?? preg_replace('/[^a-z0-9]+/', '_', strtolower($categoria));
      $primer_valor = (float) reset($rows)['hogares_miles'];
      $ultimo_valor = (float) end($rows)['hogares_miles'];
      $var_porc     = $primer_valor > 0 ? round(($ultimo_valor - $primer_valor) / $primer_valor * 100, 1) : NULL;

      $result[$clave . '_primer_anyo']  = (int) reset($rows)['anyo'];
      $result[$clave . '_ultimo_anyo']  = (int) end($rows)['anyo'];
      $result[$clave . '_primer_valor'] = $primer_valor;
      $result[$clave . '_ultimo_valor'] = $ultimo_valor;
      $result[$clave . '_var_porc']     = $var_porc;
    }
    return $result;
  }




}
