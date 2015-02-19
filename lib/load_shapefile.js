/**
 * @file Utilities for reading/processing the Quattroshapes shapefiles and
 *    loading them into `PolygonLookup`s.
 */

var through = require( 'through2' );
var shapefileStream = require( 'shapefile-stream' );
var simplify = require( 'simplify-js' );
var PolygonLookup = require( 'polygon-lookup' );

/**
 * Asynchronously create a `PolygonLookup` for a Quattroshapes shapefile. Note
 * that coordinates will be slightly simplified (see `simplifyCoords()`) to
 * increase performance/reduce memory footprint.
 *
 * @param {object} config Contains the following keys:
 *
 *    name : The name of the administrative level.
 *    path : The path of the corresponding shapefile.
 *    properties: The names of all the properties to store in the
 *      `PolygonLookup` data-structure. Since Quattroshapes had a /lot/ of name
 *      data, most of it needs to be discard to fit in memory.
 *
 * @param {function} cb The function passed the completed `PolygonLookup` and
 *    `config.name`.
 */
function loadShapefile( config, cb ){
  var polygons = [];
  function write( feature, _, next ){
    if( feature.geometry !== null ){
      feature.properties = extractProps( config.props, feature.properties );
      polygons.push( feature );
    }
    next();
  }

  function end( done ){
    var featureCollection = {
      type: 'FeatureCollection',
      features: polygons
    };
    var lookup = new PolygonLookup( featureCollection );
    cb( lookup, config.name );
    done();
  }

  shapefileStream.createReadStream( config.path )
    .pipe( through.obj( write, end ) );
}

/**
 * Return an object containing all properties in the `desiredProps` array from
 * the `allProps` objects.
 */
function extractProps( desiredProps, allProps ){
  var extracted = {};
  desiredProps.forEach( function extract( prop ){
    extracted[ prop ] = allProps[ prop ];
  });
  return extracted;
}

/**
 * @param {array} coords A 2D GeoJson-style points array.
 * @return {array} A slightly simplified version of `coords`.
 */
function simplifyCoords( coords ){
  var pts = coords.map( function mapToSimplifyFmt( pt ){
    return { x: pt[ 0 ], y: pt[ 1 ] };
  });

  var simplificationRate = 0.0026;
  var simplified = simplify( pts, simplificationRate, true );

  return simplified.map( function mapToGeoJsonFmt( pt ){
    return [ pt.x, pt.y ];
  });
}

module.exports = {
  load: loadShapefile,
  extractProps: extractProps,
  simplifyCoords: simplifyCoords
};
