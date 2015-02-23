/**
 * Warning: this is entirely a WIP proof-of-concept. Forks a `./worker`
 * process per admin level and loads one Quattroshapes layer into it.
 */

var childProcess = require( 'child_process' );
var peliasConfig = require( 'pelias-config' );
var path = require( 'path' );

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
    props: [ 'name', 'name_adm0', 'name_adm1', 'name_adm2', 'name_lau', 'name_local' ]
  }
];

/**
 * Initialize all child processes, and pass an array of them to `cb()` when
 * they've all finished loading Quattroshapes.
 */
function initWorkers( cb ){
  var numLoadedLevels = 0;

  var config = peliasConfig.generate();
  var quattroPath = config.imports.quattroshapes.datapath;
  var workers = [];
  quattroAdminLevels.forEach( function ( lvlConfig ){
    var worker = childProcess.fork( __dirname + '/worker' );
    worker.on('message', function (){
      if( ++numLoadedLevels === quattroAdminLevels.length ){
        cb(searchFromWorkers(workers));
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

function searchFromWorkers( workers ){
  /**
   * Assemble responses from different child processes in `responseMap`.
   */
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

  function completeSearch( id ){
    var responses = responseMap[ id ];
    delete responseMap[ id ];

    var node = responses.node;
    node.alpha3 = responses.admin1.qs_adm0_a3;
    node.admin0 = responses.admin1.qs_adm0;
    node.admin1 = responses.admin1.qs_a1;
    node.admin2 = responses.admin1.qs_a1 || responses.neighborhood.name_adm2;
    node.local_admin = responses.local_admin.qs_la;
    node.locality = responses.locality.qs_loc;
    node.neighborhood = responses.neighborhood.name;
    responses.cb( node );
  }

  var searchId = 0;
  /**
   * Search the Quattroshapes layers in `workers` for the given node.
   */
  function search( node, cb ){
    searchId++;
    responseMap[ searchId ] = {
      node: node,
      numResponses: 0,
      cb: cb
    };
    workers.forEach( function ( worker ){
      worker.send({
        type: 'search',
        id: searchId,
        coords: node.center_point
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

module.exports = initWorkers;
