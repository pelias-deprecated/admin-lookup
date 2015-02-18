/**
 * @file Create a Transform stream that reverse-geocodes incoming pelias-model
 * `Document`s against the Quattroshapes polygon dataset, and sets their
 * admin/alpha3 properties accordingly. Note that it will load the entire
 * dataset into memory, which makes it incredibly fast, but requires just about
 * a gigabyte of RAM (meaning that a 64-bit machine is ideal, on which Node has
 * a default 1gb memory limit instead of 512mb on 32-bit machines).
 */

'use strict';

var path = require( 'path' );
var through = require( 'through2' );
var peliasConfig = require( 'pelias-config' );
var logger = require( 'pelias-logger' ).get( 'admin-lookup' );
var async = require( 'async' );
var loadShapefile = require( './lib/load_shapefile' );

/**
 * Asynchronously create the administrative lookup stream.
 *
 * @param {function} createStreamCb The callback that will be passed the
 *    completed lookup stream when all polygons are loaded.
 */
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

  logger.info( 'Creating quattroshapes polygon lookups.' );
  function asyncIterate( config, iterateCb ){
    function lookupFromShapefileCb( lookup, lvl ){
      logger.info( 'Finished loading:', lvl );
      lookups[ lvl ] = lookup;
      iterateCb();
    }

    config.path = path.join( quattroPath, 'qs_' + config.path );
    loadShapefile.load( config, lookupFromShapefileCb );
  }

  function asyncDone(){
    logger.info( 'Finished creating lookups.' );
    createStreamCb( streamFromLookups( lookups ) );
  }

  async.each( quattroAdminLevels, asyncIterate, asyncDone);
}

/**
 * Called by `createLookupStream()`.
 *
 * @param {object} lookups Maps the names of the administrative layers,
 *    'admin1', 'admin2', etc, to the `PolygonLookup` object loaded with that
 *    layer's polygons.
 * @return {Transform stream} A stream that expects pelias-model `Document`
 *    objets and intersects them against each of the layers in `lookups`,
 *    setting their admin values (via `setAdmin()`) accordingly.
 */
function streamFromLookups( lookups ){
  var adminNameProps = {
    admin2: 'qs_a2',
    localadmin: 'qs_la',
    locality: 'qs_loc',
    neighborhood: 'name'
  };

  var stats = {
    search: {
      admin1: 0,
      admin2: 0,
      localadmin: 0,
      locality: 0,
      neighborhood: 0
    },
    set: {
      admin0: 0,
      admin1: 0,
      alpha3: 0,
      admin2: 0,
      localadmin: 0,
      locality: 0,
      neighborhood: 0
    }
  };

  var intervalId = setInterval( function logStats(  ){
    logger.verbose( 'Search misses:', stats.search );
    logger.verbose( 'Set fails:', stats.set );
  }, 1e4);

  function write( model, _, next ){
    var pt = model.getCentroid();

    var adm1 = lookups.admin1.search( pt.lon, pt.lat );
    if( adm1 !== undefined ){
      try {
        model.setAdmin( 'admin0', adm1.properties.qs_adm0 );
      } catch( ex ){
        stats.set.admin0++;
      }

      try {
        model.setAdmin( 'admin1', adm1.properties.qs_a1 );
      } catch( ex ){
        stats.set.admin1++;
      }

      try {
        model.setAlpha3( adm1.properties.qs_adm0_a3 );
      } catch( ex ){
        stats.set.alpha3++;
      }
    }
    else {
      stats.search.admin1++;
    }

    for( var lvl in adminNameProps ){
      var poly = lookups[ lvl ].search( pt.lon, pt.lat );
      if( poly !== undefined ){
        var name = poly.properties[ adminNameProps[ lvl ] ];
        try {
          model.setAdmin( lvl, name );
        } catch( ex ){
          stats.set[ lvl ]++;
        }
      }
      else {
        stats.search[ lvl ]++;
      }
    }

    this.push( model ); // jshint ignore:line
    next();
  }

  function end( done ){
    clearInterval( intervalId );
    done();
  }

  return through.obj( write, end );
}

module.exports = createLookupStream;
