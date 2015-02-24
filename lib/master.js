/**
 * @file In order to load huge volumes of polygon data into memory without
 *    breaking Node (due to its low heap-size limits), the package forks a
 *    worker process per polygon layer/shapefile. This module contains
 *    functions for initializing them and searching them.
 */

'use strict';

var childProcess = require( 'child_process' );
var peliasConfig = require( 'pelias-config' );
var path = require( 'path' );
var through = require( 'through2' );

/**
 * For every desired administrative layer, specifies its name, the partial path
 * of the corresponding Quattroshapes file, and the properties to extract from
 * it.
 */
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
    name: 'local_admin',
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
    props: [
      'name', 'name_adm0', 'name_adm1', 'name_adm2', 'name_lau', 'name_local'
    ]
  }
];

/**
 * Fork a `./worker.js` per layer in `quattroAdminLevels`, load the
 * corresponding polygons into it, and pass all workers to the `cb` callback
 * once finished.
 */
function initWorkers( cb ){
  var numLoadedLevels = 0;

  var config = peliasConfig.generate();
  var quattroPath = config.imports.quattroshapes.datapath;
  var workers = [];
  quattroAdminLevels.forEach( function ( lvlConfig ){
    var worker = childProcess.fork( path.join( __dirname, 'worker' ) );
    worker.on('message', function (){
      if( ++numLoadedLevels === quattroAdminLevels.length ){
        cb( workers );
      }
    });
    workers.push( worker );
    lvlConfig.path = path.join( quattroPath, 'qs_' + lvlConfig.path );
    worker.send( {
      type: 'load',
      config: lvlConfig
    });
  });
}

/**
 * Create functions for searching and deinitializing a set of layers workers,
 * as created with `initWorkers()`. Returns an object containing.
 *
 *    search: A function that accepts a `{ lat:, lon: }` object.
 *    end: A function to deinitialize all forked processes. Must be called to
 *        prevent hangs.
 */
function createLookup( workers ){
  // Used to pool responses from different workers per search query, and stores
  // the callback corresponding to each search.
  var responseMap = {};

  workers.forEach( function ( worker ){
    worker.on( 'message', function ( resp ){
      var responses = responseMap[ resp.id ];
      responses[ resp.name ] = resp.results;

      var hierarchyComplete = ++responses.numResponses === workers.length;
      if( hierarchyComplete ){
        completeSearch( resp.id );
      }
    });
  });

  // Once all responses for search `id` have been pooled, assemble the
  // administrative names object and pass it to that search's callback.
  function completeSearch( id ){
    var responses = responseMap[ id ];
    delete responseMap[ id ];

    var result = {};
    result.alpha3 = responses.admin1.qs_adm0_a3;
    result.admin0 = responses.admin1.qs_adm0;
    result.admin1 = responses.admin1.qs_a1;
    result.admin2 = responses.admin2.qs_a2 || responses.neighborhood.name_adm2;
    result.local_admin = responses.local_admin.qs_la;
    result.locality = responses.locality.qs_loc;
    result.neighborhood = responses.neighborhood.name;
    responses.cb( result );
  }

  // Used to disambiguate child responses if `search()`es are occuring in
  // parallel.
  var searchId = 0;

  function search( latLon, cb ){
    searchId++;
    responseMap[ searchId ] = {
      numResponses: 0,
      cb: cb
    };
    workers.forEach( function ( worker ){
      worker.send({
        type: 'search',
        id: searchId,
        coords: latLon
      });
    });
  }

  function end(){
    workers.forEach( function ( worker ){
      worker.kill();
    });
  }

  return {
    search: search,
    end: end
  };
}

/**
 * Create a streaming wrapper for the `search` and `end` functions returned by
 * `createLookup()`.
 */
function createLookupStream( workers ){
  var lookup = createLookup( workers );
  var adminLevelNames = [
    'admin0', 'admin1', 'admin2', 'local_admin', 'locality', 'neighborhood'
  ];

  function write( model, _, next ){
    lookup.search( model.getCentroid(), function ( results ){
      model.setAlpha3( results.alpha3 );
      adminLevelNames.forEach( function ( name ){
        try {
          model.setAdmin( name, results[ name ] );
        }
        catch ( ex ) {}
      });
      next( null, model );
    });
  }

  function end( done ){
    lookup.end();
    done();
  }

  return through.obj( write, end );
}

module.exports = {
  initWorkers: initWorkers,
  createLookup: createLookup,
  createLookupStream: createLookupStream
};
