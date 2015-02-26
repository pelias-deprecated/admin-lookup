/**
 * @file Test the lookup results for all points in `./lookup_points.json`
 *    against the values in their `expected` properties.
 */

'use strict';

var tape = require( 'tape' );
var supervisor = require( '../');
var lookupPoints = require( './lookup_points.json' );
var util = require( 'util' );

supervisor.lookup( function ( lookup ){
  /**
   * A wrapper for `test.end()` that closes the admin-lookup when all tests
   * have completed execution.
   */
  var numTestsCompleted = 0;
  var totalNumTests = 2;
  function completeTest( test ){
    if( ++numTestsCompleted === totalNumTests ){
      console.log( 'ended' );
      lookup.end();
    }
    test.end();
  }

  /**
   * Test lookup results for the points in `./lookup_points.json`.
   */
  tape( 'Test actual lookup results against expected.', function ( test ){
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
          completeTest( test );
        }
      });
    }

    lookupPoints.forEach( lookupTestCase );
  });

  /**
   * Not quite a unit-test, but reports the amount of time to taken to lookup a
   * large number of points.
   */
  tape( 'Test lookup speed.', function ( test ){
    function timeMs(){
      return new Date().getTime();
    }

    var numLookupPoints = 50000;
    var points = [];
    for( var pt = 0; pt < numLookupPoints; pt++ ){
      points.push({
        lat: 85 * (Math.random() * 2 - 1),
        lon: 180 * (Math.random() * 2 - 1)
      });
    }

    var numCompleted = 0;
    var startTime = timeMs();
    function searchPoint( pt ){
      lookup.search( pt, function (){
        if( ++numCompleted === numLookupPoints ){
          var timeTaken = timeMs() - startTime;
          test.pass( util.format(
            'Total time taken (ms) for %d points: %s',
            numLookupPoints, timeTaken
          ));
          test.pass(
            'Average time per point (ms): ' + timeTaken / numLookupPoints
          );
          completeTest( test );
        }
      });
    }

    points.forEach( searchPoint );
  });
});
