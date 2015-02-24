/**
 * High-level module that melds together all the other components of the
 * package into a clean API. See the referenced modules for relevant
 * per-function documentation.
 */

var master = require( './lib/master' );

function createLookup( cb ){
  master.initWorkers( function ( workers ){
    cb( master.createLookup( workers ) );
  });
}

function createLookupStream( cb ){
  master.initWorkers( function ( workers ){
    cb( master.createLookupStream( workers ) );
  });
}

module.exports = {
  lookup: createLookup,
  stream: createLookupStream
};
