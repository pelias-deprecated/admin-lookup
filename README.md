# admin-lookup
[![Build Status](https://travis-ci.org/pelias/admin-lookup.svg?branch=master)](https://travis-ci.org/pelias/admin-lookup)

[![NPM](https://nodei.co/npm/pelias-admin-lookup.png)](https://nodei.co/npm/pelias-admin-lookup/)

A fast, local, streaming Quattroshapes coarse reverse-geocoder. Loads the [Quattroshapes
dataset](http://quattroshapes.com/) into memory, simplifying geometries and stripping superfluous attributes along the
way, and creates a `Transform` stream that builds the administrative name hierarchy (eg, names for `admin0`, `admin1`,
`alpha3`, etc) for incoming `pelias-model` `Document` objects via their setter methods. Useful if you want to
automagically populate a dataset with country/state/county/neighborhood names when it's missing them.

## API
##### `createLookupStream( createStreamCb )`
Asynchronously builds the lookup stream. Quattroshapes shapefiles will be read from the path specified in
`pelias-config`; it's recommended that you use our [simplified
version](http://data.mapzen.com/quattroshapes/quattroshapes-simplified.tar.gz), and even then, expect to load nearly a
gigabyte of data into RAM. It's consequently a good idea to use this on a 64-bit machine, on which Node has a default
1gb memory limit instead of 512mb on 32-bit systems.

* `createStreamCb`: the callback that will be passed the lookup stream once it's complete.

## example usage

```javascript
var peliasAdminLookup = require( 'pelias-admin-lookup' );

var dataStream = /* some stream of Document objects */;
peliasAdminLookup( function( lookupStream ){
	dataStream
		.pipe( lookupStream )
		.pipe( /* down the pelias pipeline */ );
});
```
