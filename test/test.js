/**
 * @file All of the package's unit tests.
 */

var tape = require( 'tape' );
var index = require( '../index' );
var loadShapefile = require( '../lib/load_shapefile' );

tape( 'extractProps() extracts properties.', function ( test ){
  var testCases = [
    {
      desired: [],
      all: {boiler: 'plate'},
      result: {}
    },
    {
      desired: [ 'a', 'b' ],
      all: { a: 1, b: 2, c: 3, d: 5 },
      result: { a: 1, b: 2 }
    }
  ];

  testCases.forEach( function ( testCase ){
    var result = loadShapefile.extractProps( testCase.desired, testCase.all );
    test.deepEqual( result, testCase.result, 'Matches expected.' );
  });
  test.end();
});

tape( 'simplifyCoords() simplifies coordinates.', function ( test ){
  var coords = [
    [ -88.17948, 33.150064 ],
    [ -88.176493, 33.150061 ],
    [ -88.174872, 33.15006 ],
    [ -88.173956, 33.150068 ],
    [ -88.172991, 33.149269 ],
    [ -88.172777, 33.149096 ],
    [ -88.171263, 33.147854 ],
    [ -88.171291, 33.146395 ],
    [ -88.177247, 33.146363 ],
    [ -88.179577, 33.14642 ],
    [ -88.17948, 33.150064 ]
  ];

  var expected = [
    [ -88.17948, 33.150064 ],
    [ -88.171291, 33.146395 ],
    [ -88.179577, 33.14642 ],
    [ -88.17948, 33.150064 ]
  ];

  test.deepEqual(
    loadShapefile.simplifyCoords( coords ), expected,
    'Simplified coordinates match expected.'
  );
  test.end();
});

tape( 'Module interfaces.', function ( test ){
  test.equal( typeof index, 'function', 'index is a function.' );
  test.equal( typeof loadShapefile, 'object', 'loadShapefile is an object.' );
  test.end();
});
