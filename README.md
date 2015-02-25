# admin-lookup
[![Build Status](https://travis-ci.org/pelias/admin-lookup.svg?branch=master)](https://travis-ci.org/pelias/admin-lookup)

[![NPM](https://nodei.co/npm/pelias-admin-lookup.png)](https://nodei.co/npm/pelias-admin-lookup/)

A fast, local, streaming Quattroshapes coarse reverse-geocoder. Loads the [Quattroshapes
dataset](http://quattroshapes.com/) into memory, simplifying geometries and stripping superfluous attributes along the
way, and creates a `Transform` stream that builds the administrative name hierarchy (eg, names for `admin0`, `admin1`,
`alpha3`, etc) for incoming `pelias-model` `Document` objects via their setter methods. Useful if you want to
automagically populate a dataset with country/state/county/neighborhood names when it's missing them.

Quattroshapes files will be read from the path specified in your local `pelias-config`: if you'd like to override it,
drop this into `~/pelias.json`:

```
{
  "imports": {
    "quattroshapes": {
      "datapath": "/path/to/my/Quattroshapes/"
    }
  }
}
```

It's recommended that you use our [simplified version](http://data.mapzen.com/quattroshapes/quattroshapes-simplified.tar.gz),
and even then, expect to load over a gigabyte of data into RAM. It's consequently a good idea to use this on a 64-bit
machine, on which Node has a default 1gb memory limit instead of 512mb on 32-bit systems.

## API
##### `lookup( cb )`
Asynchronously builds the admin lookup.

  * `cb`: the callback that will be passed an object containing `search` and `end` functions. `search` accepts a
    `{lat:, lon:}` object and returns an object containing admin-level names. `end()` must be called when you're
    finished with the lookup, to perform all necessary cleanup.

##### `stream( cb )`
A wrapper for `createLookup()` that asynchronously builds a lookup stream. It'll expect
[pelias-model](https://github.com/pelias/model) `Document`s, and call their `set*()` setters with the results of the
lookup.

  * `cb`: the callback that will be passed the lookup stream once it's assembled.

## example usage

```javascript
var peliasAdminLookup = require( 'pelias-admin-lookup' );

var dataStream = /* some stream of Document objects */;
peliasAdminLookup.stream( function( lookupStream ){
	dataStream
		.pipe( lookupStream )
		.pipe( /* down the pelias pipeline */ );
});
```

## technical note
The admin-lookup loads over a gigabyte of data into memory, which exceeds Node's *de facto* limit and will eventually
cause the process to freeze up (as the garbage collector churns away attempting to reclaim memory). As a result, it'll
fork a child process per admin layer for multiple V8 heaps and slightly simplify polygons.

## acceptance tests
The package ships with a minimal unit-testing suite (`npm test`), and with two more comprehensive testing methods:

  * `npm run test-lookups`: will load the admin-lookup and run it against the test-cases found in
    `test/lookup_points.json`, reporting any mismatches.
  * `npm run test-web-app`: a tool that'll load the admin-lookup, and serve a dead-simple browser app that allows you
    to pan around a map and receive lookup results for the points that you click on. Should make it easy to continually
    test the package while modifying it.

At the least, run `test-lookups` locally after introducing a change!
