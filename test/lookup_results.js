/**
 * @file Test the lookup results for all points in `./lookup_points.json`
 *    against the values in their `expected` properties.
 */

'use strict';

var tape = require( 'tape' );
var supervisor = require( '../supervisor' );
var lookupPoints = require( './lookup_points.json' );
var util = require( 'util' );

tape( 'Test actual lookup results against expected.', function ( test ){
  supervisor.lookup( function ( lookup ){
    var numCompletedTestCases = 0;

    function lookupTestCase( testCase ){
      var node = { center_point: testCase.point };
      lookup.search( node, function ( result ){
        for( var key in testCase.expected ){
          var msg = util.format(
            '`%s` matches expected for %s.',
            key, JSON.stringify( testCase.point )
          );
          test.equal( result[ key ], testCase.expected[ key ], msg);
        }
        if( ++numCompletedTestCases === lookupPoints.length ){
          lookup.end();
          test.end();
        }
      });
    }

    lookupPoints.forEach( lookupTestCase );
  });
});
