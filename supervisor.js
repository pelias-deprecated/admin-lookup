/**
 * Warning: this is entirely a WIP proof-of-concept. Forks a `./worker`
 * process per admin level and loads one Quattroshapes layer into it.
 */

var childProcess = require( 'child_process' );
var peliasConfig = require( 'pelias-config' );
var path = require( 'path' );
var through = require( 'through2' );

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

function createLookup( workers ){
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

    var result = {};
    result.alpha3 = responses.admin1.qs_adm0_a3;
    result.admin0 = responses.admin1.qs_adm0;
    result.admin1 = responses.admin1.qs_a1;
    result.admin2 = responses.admin2.qs_a2 || responses.neighborhood.name_adm2;
    result.local_admin = responses.local_admin.qs_la;
    result.locality = responses.locality.qs_loc;
    result.neighborhood = responses.neighborhood.name;
    // console.log( JSON.stringify( result, undefined, 4 ) );
    responses.cb( result );
  }

  var searchId = 0;
  /**
   * Search the Quattroshapes layers in `workers` for the given node.
   */
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
  lookup: function (cb){
    initWorkers( function ( workers ){
       cb( createLookup( workers ) );
    });
  },
  stream: function (cb){
    initWorkers( function ( workers ){
       cb( createLookupStream( workers ) );
    });
  }
};
