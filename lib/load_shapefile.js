var through = require( 'through2' );
var shapefileStream = require( 'shapefile-stream' );
var simplify = require( 'simplify-js' );
var PolygonLookup = require( '../../polygon-lookup' );

function loadShapefile( config, cb ){
  var polygons = [];
  function write( feature, _, next ){
    if( feature.geometry !== null ){
      feature.properties = extractProps( config.props, feature.properties );
      switch( feature.geometry.type ){
        case 'Polygon':
          var coords = feature.geometry.coordinates[ 0 ];
          feature.geometry.coordinates[ 0 ] = simplifyCoords( coords );
          break;

        case 'MultiPolygon':
          var polys = feature.geometry.coordinates;
          polys.forEach( function simplify( coords, ind ){
            polys[ ind ][ 0 ] = simplifyCoords( coords[ 0 ] );
          });
          break;
      }
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

function extractProps( desiredProps, allProps ){
  var extracted = {};
  desiredProps.forEach( function extract( prop ){
    extracted[ prop ] = allProps[ prop ];
  });
  return extracted;
}

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

module.exports = loadShapefile;
