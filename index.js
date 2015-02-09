'use strict';

var path = require( 'path' );
var shapefileStream = require( 'shapefile-stream' );
var simplify = require( 'simplify-js' );
var through = require( 'through2' );
var peliasConfig = require( 'pelias-config' );
var PolygonLookup = require( '../polygon-lookup' );

function createLookupStream( cb ){
  var quattroAdminLevels = [
    {
      name: 'admin1',
      path: 'adm1',
      props: [ 'qs_adm0', 'qs_adm0_a3', 'qs_a1' ]
    },
    {
      name: 'admin2',
      path: 'adm2',
      props: [ 'qs_a2' ]
    },
    {
      name: 'localadmin',
      path: 'localadmin',
      props: [ 'qs_la' ]
    },
    {
      name: 'locality',
      path: 'localities',
      props: [ 'qs_loc' ]
    },
    {
      name: 'neighborhood',
      path: 'neighborhoods',
      props: [ 'name' ]
    }
  ];

  var lookups = {};
  var lookupsCreated = 0;
  function lookupFromShapefile( lookup, lvl ){
    console.log( lvl );
    lookups[ lvl ] = lookup;
    if( ++lookupsCreated === Object.keys( quattroAdminLevels ).length ){
      console.log( 'total time', new Date().getTime() - startTime );
      cb( streamFromLookups( lookups ) );
    }
  }

  var config = peliasConfig.generate();
  var quattroPath = config.imports.quattroshapes.datapath;

  var startTime = new Date().getTime();
  quattroAdminLevels.forEach( function load( config ){
    config.path = path.join( quattroPath, 'qs_' + config.path );
    loadShapefile( config, lookupFromShapefile );
  });
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

function streamFromLookups( lookups ){
  var adminNameProps = {
    admin2: 'qs_a2',
    localadmin: 'qs_la',
    locality: 'qs_loc',
    neighborhood: 'name'
  };

  return through.obj( function write( model, _, next ){
    var pt = model.getCentroid();
    var adm1 = lookups.admin1.search( pt.lat, pt.lon );

    try {
      model.setAdmin( 'admin0', adm1.qs_adm0 );
    } catch( ex ){}

    try {
      model.setAdmin( 'admin1', adm1.qs_adm1 );
    } catch( ex ){}

    try {
      model.setAlpha3( adm1.qs_adm0_a3 );
    } catch( ex ){}

    for( var lvl in adminNameProps ){
      var poly = lookups[ lvl ].search( pt.lat, pt.lon );
      if( poly !== undefined ){
        var name = poly.properties[ adminNameProps[ lvl ] ];
        try {
          model.setAdmin( lvl, name );
        } catch( ex ){};
      }
    }

    next();
  });
}

module.exports = createLookupStream;
