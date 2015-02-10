'use strict';

var path = require( 'path' );
var through = require( 'through2' );
var peliasConfig = require( 'pelias-config' );
var loadShapefile = require( './lib/load_shapefile' );

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
      model.setAdmin( 'admin0', adm1.properties.qs_adm0 );
    } catch( ex ){}

    try {
      model.setAdmin( 'admin1', adm1.properties.qs_a1 );
    } catch( ex ){}

    try {
      model.setAlpha3( adm1.properties.qs_adm0_a3 );
    } catch( ex ){}

    for( var lvl in adminNameProps ){
      var poly = lookups[ lvl ].search( pt.lat, pt.lon );
      if( poly !== undefined ){
        var name = poly.properties[ adminNameProps[ lvl ] ];
        try {
          model.setAdmin( lvl, name );
        } catch( ex ){}
      }
    }

    this.push( model );
    next();
  });
}

module.exports = createLookupStream;
