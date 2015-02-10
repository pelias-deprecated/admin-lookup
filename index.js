'use strict';

var path = require( 'path' );
var through = require( 'through2' );
var peliasConfig = require( 'pelias-config' );
var async = require( 'async' );
var loadShapefile = require( './lib/load_shapefile' );

function createLookupStream( createStreamCb ){
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

  var config = peliasConfig.generate();
  var quattroPath = config.imports.quattroshapes.datapath;

  var lookups = {};

  function asyncIterate( config, iterateCb ){
    function lookupFromShapefileCb( lookup, lvl ){
      lookups[ lvl ] = lookup;
      iterateCb();
    }

    config.path = path.join( quattroPath, 'qs_' + config.path );
    loadShapefile( config, lookupFromShapefileCb );
  }

  var startTime = new Date().getTime();
  function asyncDone(){
    var endTime = new Date().getTime();
    console.log( 'total time', endTime - startTime );
    createStreamCb( streamFromLookups( lookups ) );
  }

  async.each( quattroAdminLevels, asyncIterate, asyncDone);
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
