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

function initWorkers( cb ){
  var numLoadedLevels = 0;

  var config = peliasConfig.generate();
  var quattroPath = config.imports.quattroshapes.datapath;
  var workers = [];
  quattroAdminLevels.forEach( function ( lvlConfig ){
    var worker = childProcess.fork( './worker' );
    worker.on('message', function (){
      if( ++numLoadedLevels === quattroAdminLevels.length ){
        cb(workers);
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

initWorkers( function (workers){
  var responseMap = {};

  var searchId = 0;
  function search( node ){
    searchId++;
    responseMap[ searchId ] = {
      node: node,
      numResponses: 0
    };
    workers.forEach( function ( worker ){
      worker.send({
        type: 'search',
        id: searchId,
        coords: node.center_point
      });
    });
  }

  var adminNameProps = {
    qs_adm0: 'admin0',
    qs_adm0_a3: 'alpha3',
    qs_a1: 'admin1',
    qs_a2: 'admin2',
    qs_la: 'localadmin',
    qs_loc: 'locality',
    name: 'neighborhood'
  };
  workers.forEach( function ( worker ){
    worker.on( 'message', function ( resp ){
      var responses = responseMap[ resp.id ];
      for( var key in resp.results ){
        if( resp.results[ key ] !== undefined && resp.results[ key ] !== null ){
          responses.node[ adminNameProps[ key ] ] = resp.results[ key ];
        }
      }
      if( ++responses.numResponses === workers.length ){
        delete responseMap[ resp.id ];
        console.log( JSON.stringify( responses.node, undefined, 4 ) );
      }
    });
  });

  require( './points.json' ).forEach( function ( point ){
    var node = {
      name: point.name,
      center_point: {
        lat: point.lat,
        lon: point.lon,
      }
    };
    search( node );
  });
});
