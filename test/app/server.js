/**
 * @file The web-app server.
 */

'use strict';

var express = require( 'express' );
var supervisor = require( '../../supervisor' );

supervisor.lookup( function ( lookup ){
  var app = express();
  app.use(express.static(__dirname + '/static'));
  app.get( '/reverse/:lat/:lon', function ( req, res ){
    var node = req.params;
    lookup.search( node, function ( result ){
      delete result.center_point;
      res.write( JSON.stringify( result, undefined, 4 ) );
      res.end();
    });
  });
  app.listen(3000);
  console.log( 'Listening on 3000.' );
});
