/**
 * @file Test the lookup results for all points in `./lookup_points.json`
 *    against the values in their `expected` properties.
 */

'use strict';

var tape = require( 'tape' );
var supervisor = require( '../');
var lookupPoints = require( './lookup_points.json' );
var util = require( 'util' );

tape( 'Test actual lookup results against expected.', function ( test ){
  supervisor.lookup( function ( lookup ){
    var numCompletedTestCases = 0;

    function lookupTestCase( testCase ){
      lookup.search( testCase.point, function ( result ){
        var failed = false;
        for( var key in testCase.expected ){
          if( result[ key ] !== testCase.expected[ key ] ){
            failed = true;
            var msg = util.format(
              '`%s` does not match for %s.',
              key, JSON.stringify( testCase.point )
            );
            test.fail( msg );
          }
        }

        if( !failed ){
          test.pass( 'Test passed for: ' + JSON.stringify( testCase.point ) );
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
