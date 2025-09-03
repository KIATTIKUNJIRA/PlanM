import React from 'react';
import Map from 'react-map-gl';

const MapView = () => {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  return (
    <Map
      mapboxAccessToken={mapboxToken}
      initialViewState={{
        longitude: 100.523186, // Bangkok Longitude
        latitude: 13.736717,   // Bangkok Latitude
        zoom: 10
      }}
      style={{width: '100%', height: '100%'}}
      mapStyle="mapbox://styles/mapbox/streets-v11"
    >
      {/* Markers for locations like Lotus, Bangchak will go here */}
    </Map>
  );
};

export default MapView;