import React, { useState, useEffect, useRef } from "react";
import { View } from "react-native";
import MapView, { Heatmap, LatLng } from "react-native-maps";
import axios from "axios";
import SoundmapKey from "./SoundmapKey";

type WeightedLatLng = LatLng & {
  weight?: number;
};

// FETCH OSM INFRASTRUCTURE DATA (BUILDINGS AND HIGHWAYS)---------------------------------------------------------------------

export var queriedBuildings: {[key: string] : number} = {};

function makeDictKey(lat: number, lon: number): string {
  return `${lat},${lon}`;
}

export async function fetchInfrastructure(northeastBounds: LatLng, southwestBounds: LatLng) {
  let bounds = `${northeastBounds.latitude}, ${northeastBounds.longitude}, ${southwestBounds.latitude}, ${southwestBounds.longitude}`
  let query = `
    [out:json];
    (
      way["building"](${bounds});
    );
    out geom 100;
  `;

  // console.log(query);

  const url = `https://overpass-api.de/api/interpreter`;
  const response = await axios.post(url, query);
  const buildings = response.data.elements;
  // console.log(JSON.stringify(buildings));
  
  let query2 = "[out:json];";
  let newBuildings = [];

  for (var i = 0; i < buildings.length; i++) {
    let item = buildings[i];
    let lat = item.bounds.minlat;
    let lon = item.bounds.minlon;

    if (!queriedBuildings[makeDictKey(lat, lon)]) {
      newBuildings.push(buildings[i]);
      query2 += `
        (
          way(around:100, ${lat}, ${lon})["highway"];
          node(around:100, ${lat}, ${lon})["highway"];
        );
        out count;
      `
    }
  }

  // console.log(query2);

  const response2 = await axios.post(url, query2);

  // console.log(JSON.stringify(response2.data));

  var dataPoints: WeightedLatLng[] = [];

  let index = 0;
  for (var b = 0; b < buildings.length; b++) {
    const lat = buildings[b].bounds.minlat;
    const lon = buildings[b].bounds.minlon;
    if (queriedBuildings[makeDictKey(lat, lon)]) {
      console.log("Hit cache");
      dataPoints.push({
        latitude: lat,
        longitude: lon,
        weight: queriedBuildings[makeDictKey(lat, lon)]
      });
    } else {
      // console.log(JSON.stringify(response2.data.elements[index]));
      const weight = predictSoundLevelByRoadCount(response2.data.elements[index].tags.total || 0);
      queriedBuildings[makeDictKey(lat, lon)] = weight;
      dataPoints.push({
        latitude: lat,
        longitude: lon,
        weight: weight
      });
      index++;
    }
  }

  // console.log(dataPoints);
  return dataPoints;

}


// PREDICT SOUND LEVEL FROM DENSITY -----------------------------------------------------------------------------------------

export function predictSoundLevel(roadCount: number, buildingCount: number) {
  var soundLevel = (roadCount * 5 + buildingCount * 2) / 15; // more weight for roads
  if (soundLevel <= 1) {
    soundLevel = 0;
  }
  return soundLevel;
}

export function predictSoundLevelByRoadCount(roadCount: number) {
  var soundLevel = (roadCount * 5) / 10;
  if (soundLevel <= 1) {
    soundLevel = 0;
  }
  return soundLevel;
}

// CREATE HEAT MAP ----------------------------------------------------------------------------------------------------------

const SoundHeatMap: React.FC = () => {
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 47.608013,
          longitude: -122.335167,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Heatmap
          points={[
            { latitude: 47.608013, longitude: -122.335167, weight: 35 },
            { latitude: 47, longitude: -122.335167, weight: 20 },
          ]} // test: [{ latitude: 47.608013, longitude: -122.335167, weight: 35 }, { latitude: 47, longitude: -122.335167, weight: 20 }]
          radius={50}
          opacity={0.7}
          gradient={{
            colors: ["green", "yellow", "orange", "red"],
            startPoints: [0.01, 0.25, 0.5, 1],
            colorMapSize: 200,
          }}
        />
      </MapView>
      <SoundmapKey />
    </View>
  );
};

export default SoundHeatMap;
