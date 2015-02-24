/**
 * Warning: this is entirely a WIP proof-of-concept. Forks a `./worker`
 * process per admin level and loads one Quattroshapes layer into it.
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
