import React, { useState, useRef } from "react"
import useSwr from 'swr';
import ReactMapGL, { Marker, FlyToInterpolator } from 'react-map-gl';
import useSupercluster from 'use-supercluster';
import "./App.css";
import 'mapbox-gl/dist/mapbox-gl.css';
import CrimeMarkerImage from './custody.svg';

const fetcher = (...args) => fetch(...args).then(response => response.json());

export default function App() {
  // setup map
  const [viewport, setViewport] = useState({
    latitude: 52.6376,
    longitude: -1.135171,
    width: "100vw",
    height: "100vh",
    zoom: 6
  });

  const mapRef = useRef();

  // load and prepare data
  const url = "https://data.police.uk/api/crimes-street/all-crime?lat=52.629729&lng=-1.131592&date=2019-10";

  const { data, error } = useSwr(url, fetcher);

  const crimes = data && !error ? data.slice(0, 2000) : [];

  // returns GEO JSON Feature Object
  const points = crimes.map(crime => ({
    type: "Feature",
    properties: {
      cluster: false,
      crimeId: crime.id,
      category: crime.category
    },
    geometry: {
      type: "Point",
      coordinates: [crime.location.longitude, crime.location.latitude]
    }
  }))
  // get map bounds
  const bounds = mapRef.current ? mapRef.current.getMap().getBounds().toArray().flat() : null;


  // get clusters
  const { clusters, supercluster } = useSupercluster({
    points,
    zoom: viewport.zoom,
    bounds,
    options: { radius: 75, maxZoom: 20 }
  })

  // return map
  return (
    <ReactMapGL
      {...viewport}
      mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
      onViewportChange={newViewport => {
        setViewport({ ...newViewport });
      }}
      ref={mapRef}
    >

      {clusters.map(cluster => {

        const [longitude, latitude] = cluster.geometry.coordinates
        const { cluster: isCluster, point_count: pointCount } = cluster.properties;

        if (isCluster) {
          return (
            <Marker key={cluster.id} latitude={latitude} longitude={longitude}>
              <div className="cluster-marker" style={{
                width: `${10 + (pointCount / points.length) * 30}px`,
                height: `${10 + (pointCount / points.length) * 30}px`
              }}
                onClick={() => {
                  const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 20)
                  setViewport({
                    ...viewport,
                    latitude,
                    longitude,
                    zoom: expansionZoom,
                    transitionInterpolator: new FlyToInterpolator({
                      speed: 2
                    }),
                    transitionDuration: "auto"
                  })
                }}
              >
                {pointCount}
              </div>
            </Marker>
          )
        }
        return (
          <Marker key={cluster.properties.crimeId}
            latitude={parseFloat(latitude)}
            longitude={parseFloat(longitude)}>
            <button className="crime-marker">
              <img src={CrimeMarkerImage} alt="Crime" />
            </button>
          </Marker>
        )
      })}
    </ReactMapGL >
  )
}