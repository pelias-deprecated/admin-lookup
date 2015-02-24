/**
 * A worker processes intended to be launched by the `./master.js` module.
 * Loads one polygon layer into memory, builds a `PolygonLookup` for it, and
 * then returns intersection results for `search` queries.
 */

var loadShapefile = require( './load_shapefile' );
var peliasLogger = require( 'pelias-logger' );

var adminLookup; // This worker's `PolygonLookup`.
var name; // The name of this layer (eg, 'admin1', 'neighborhood').

/**
 * Search `adminLookup` for `latLon`.
 */
function search( latLon ){
  var poly = adminLookup.search( latLon.lon, latLon.lat );
  var properties = (poly === undefined) ? {}: poly.properties;
  return properties;
}

/**
 * Load the layer specified by `layerConfig`
 * (see `./master.js:quattroAdminLevels`).
 */
function loadLayer( layerConfig ){
  var logger = peliasLogger.get( 'admin-lookup:worker:' + layerConfig.name );
  name = layerConfig.name;
  logger.info( 'Loading `%s`.', name );
  loadShapefile.load( layerConfig, function ( lookup ){
    adminLookup = lookup;
    logger.info( 'Loaded `%s`.', name );
    process.send( 'loaded' );
  });
}

function messageHandler( msg ){
  if( msg.type === 'load' ){
    loadLayer( msg.config );
  }

  else if( msg.type === 'search' ){
    process.send({
      name: name,
      id: msg.id,
      results: search( msg.coords )
    });
  }
}

process.on( 'message', messageHandler );
