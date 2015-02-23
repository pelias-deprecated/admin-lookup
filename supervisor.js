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
      for( var key in resp.results ){
        if( resp.results[ key ] !== undefined && resp.results[ key ] !== null ){
          responses.node[ adminNameProps[ key ] ] = resp.results[ key ];
        }
      }
      var hierarchyComplete = ++responses.numResponses === workers.length;
      if( hierarchyComplete ){
        var cb = responseMap[ resp.id ].cb;
        var node = responseMap[ resp.id ].node;
        delete responseMap[ resp.id ];
        cb( node );
      }
    });
  });

  // Remap Quattro attribute names to more readable ones.
  var adminNameProps = {
    qs_adm0: 'admin0',
    qs_adm0_a3: 'alpha3',
    qs_a1: 'admin1',
    qs_a2: 'admin2',
    qs_la: 'local_admin',
    qs_loc: 'locality',
    name: 'neighborhood'
  };

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
