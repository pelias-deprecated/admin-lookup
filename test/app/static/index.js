/* global L, XMLHttpRequest */

var map; // the leaflet map

/**
 * Initialize leaflet, set `click` handler, etc.
 */
(function configureMap(){
  'use strict';

  map = L.map( 'map' ).setView( [ 40.7259, -73.9806 ], 5 );
  L.tileLayer( 'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map);
  map.on( 'click', onClick );
})();

/**
 * Handler for leaflet click events. Spawns a label with the admin-lookup
 * results for the latitude/longitude of the user's mouse.
 */
function onClick( evt ){
  'use strict';

  var latlng = evt.latlng;
  var nameProps = reversePoint( latlng.lat, latlng.lng );
  var names = [];

  var nameOrder = [
    'neighborhood', 'locality', 'local_admin', 'admin2', 'admin1', 'admin0',
    'alpha3'
  ];
  nameOrder.forEach( function ( key ){
    var nameStr = nameProps[ key ] === undefined ? '' : nameProps[ key ];
    names.push( key + ': ' + nameStr );
  });
  var name = names.join( '<br>' );

  L.marker( [ latlng.lat, latlng.lng ] )
    .bindLabel( name, { noHide: true } )
    .addTo( map );
}

/**
 * Send a synchronous admin-lookup request to the server.
 */
function reversePoint( lat, lon ){
  'use strict';

  var url = [
    'http://localhost:3000/reverse', lat.toString(), lon.toString()
  ].join( '/' );

  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open( 'GET', url, false );
  xmlHttp.send( null );
  return JSON.parse(xmlHttp.responseText);
}
