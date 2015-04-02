/**
 * @file Test the pelias-model setter stream created by
 *    `../lib/master#stream()`. Reads points and corresponding expected values
 *    from `./lookup_stream.json`
 */

'use strict';

var through = require( 'through2' );
var lookup = require( '../lib/master' );
var peliasModel = require( 'pelias-model' );
var tape = require( 'tape' );

var lookupPoints = require( './lookup_points.json' );

/**
 * Test whether the setter stream sets values properly, using the points inside
 * `lookupPoints` as test-cases. Make sure that existing values are /not/
 * overwritten (these are stored in some test-cases' `existing` properties) and
 * that certain setters can be disabled via `dontSet` properties in Documents'
 * `_meta` properties (these are present in a `dontSet` property in some
 * test-cases).
 */
tape( 'Test setter stream.', function ( test ){
  var expectedValues = lookupPoints.map( function ( testCase ){
    return {lookup: testCase.expected, existing: testCase.existing || {}};
  });

  var adminLevelNames = [
    'admin0', 'admin1', 'admin1_abbr', 'admin2', 'local_admin', 'locality', 'neighborhood'
  ];
  var lookupStream = lookup.stream();

  var testPipe = through.obj(
    function write( data, _, next ){
      console.log( JSON.stringify( data, undefined, 4 ) );
      var expected = expectedValues.shift();
      function getExpectedValue( propName ){
        if( expected.existing.hasOwnProperty( propName ) ){
          return expected.existing[ propName ];
        }
        else {
          var dontSet = ( data.getMeta( 'adminLookup' ) || {} ).dontSet;
          return ( dontSet === undefined || dontSet.indexOf( propName ) === -1 ) ?
            expected.lookup[ propName ] :
            undefined;
        }
      }

      for( var prop in expected.lookup ){
        if( adminLevelNames.indexOf( prop ) !== -1 ){
          test.equal( data.getAdmin( prop ), getExpectedValue( prop ), prop + ' matches.' );
        }
      }

      if( expected.lookup.hasOwnProperty( 'alpha3' ) ){
        test.equal( data.getAlpha3(), getExpectedValue( 'alpha3' ), 'alpha3 matches.' );
      }

      next();
    }, function end( done ){
      test.end();
      done();
    }
  );

  lookupStream.pipe( testPipe );
  lookupPoints.forEach( function ( testCase ){
    var doc = new peliasModel.Document( '_', 1 ).setCentroid( testCase.point );
    if( testCase.hasOwnProperty( 'existing' ) ){
      for( var prop in testCase.existing ){
        if( adminLevelNames.indexOf( prop ) !== -1 ){
          doc.setAdmin( prop, testCase.existing[ prop ] );
        }
      }

      if( testCase.existing.hasOwnProperty( 'alpha3' ) ){
        doc.setAlpha3( testCase.existing.alpha3 );
      }
    }
    if( testCase.hasOwnProperty( 'dontSet' ) ){
      doc.setMeta( 'adminLookup', {dontSet: testCase.dontSet} );
    }
    lookupStream.write( doc );
  });
  lookupStream.end();
});
