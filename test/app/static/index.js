/* global L, XMLHttpRequest */

var map = L.map( 'map' ).setView( [ 40.7259, -73.9806 ], 5 );

L.tileLayer( 'http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  maxZoom: 18
}).addTo(map);

function onClick( evt ){
  'use strict';

  var latlng = evt.latlng;
  var nameProps = reverse( latlng.lat, latlng.lng );
  var nameOrder = [
    'neighborhood', 'locality', 'local_admin', 'admin2', 'admin1', 'admin0', 'alpha3'
  ];
  var names = [];
  nameOrder.forEach( function ( key ){
    var nameStr = nameProps[ key ] === undefined ? '' : nameProps[ key ];
    names.push( key + ': ' + nameStr );
  });
  var name = names.join( '<br>' );
  console.log( name );
  L.marker( [ latlng.lat, latlng.lng ] )
    .bindLabel( name, { noHide: true } )
    .addTo( map );
}

function reverse( lat, lon ){
  'use strict';

  var url = [
    'http://localhost:3000/reverse', lat.toString(), lon.toString()
  ].join( '/' );

  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open( 'GET', url, false );
  xmlHttp.send( null );
  return JSON.parse(xmlHttp.responseText);
}

map.on( 'click', onClick );
