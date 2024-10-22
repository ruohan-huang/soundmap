import React, { useState, useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Heatmap, LatLng } from 'react-native-maps';
import axios from 'axios';

type WeightedLatLng = LatLng & {
  weight?: number;
};


// FETCH OSM INFRASTRUCTURE DATA (BUILDINGS AND HIGHWAYS)---------------------------------------------------------------------

// export async function fetchOSMData(centerPoint: number[] | [any, any], radius: number) {
//     const [lat, lon] = centerPoint;
//     const query = `
//         [out:json];
//         (
//             way(around:${radius}, ${lat}, ${lon})["highway"];
//             way(around:${radius}, ${lat}, ${lon})["building"];
//         );
//         out body;
//         >;
//         out skel qt;
//     `;
//     const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
//     const response = await axios.get(url);
//     return response.data;
// }

fetchOSMData([47.608013], [-122.335167], 1000);

export async function fetchOSMData(latitudes: number[], longitudes: number[], radius: number) {
  var dataPoints: WeightedLatLng[] = [];
  for (var i = 0; i < latitudes.length; i++) {
    for (var k = 0; k < longitudes.length; k++) {
      const query = `
        [out:csv(::type,::count)];

        way(around:${radius}, ${i}, ${k})["building"];
        out count;

        way(around:${radius}, ${i}, ${k})["highway"];
        out count;
      `
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const response = await axios.get(url);
      console.log(response.data);
      const newWeightedLatLng: WeightedLatLng = {
        latitude: i,
        longitude: k,
        weight: predictSoundLevel(response.data.buildingCount, response.data.highway)
      }
      dataPoints.push(newWeightedLatLng);

      return(dataPoints);
    }
  }
}

// test

// const centerPoint = [47.608013, -122.335167]; // (Seattle)
// const radius = 1000; // meters

// fetchOSMData(centerPoint, radius).then(data => {
//     console.log(data); // OSM data within specified radius
// });


// PREDICT SOUND LEVEL FROM DENSITY -----------------------------------------------------------------------------------------

export function predictSoundLevel(roadCount: number, buildingCount: number) {
    var soundLevel = ((roadCount * 5) + (buildingCount * 2)) / 1000; // more weight for roads
    if (soundLevel <= 35) {
      soundLevel = 35;
    }
    return soundLevel;
}


// CREATE HEAT MAP ----------------------------------------------------------------------------------------------------------

const SoundHeatMap: React.FC = () => {
    // const [heatMapData, setHeatMapData] = useState<WeightedLatLng[]>([]);

    // fetch + predict sound levels
    // const fetchAndPredictSoundLevels = async (centerPoint: [number, number], radius: number) => {
    //     const data = await fetchOSMData(centerPoint, radius);
    //     const predictedSoundLevel = predictSoundLevel(data);

    //     console.log(data);
    //     console.log(predictedSoundLevel);
        
    //     // add heatmap datapoint w/ predicted sound level
    //     setHeatMapData(prevData => [
    //     ...prevData,
    //     { latitude: centerPoint[0], longitude: centerPoint[1], weight: predictedSoundLevel }
    //     ]);
    // };
  
    // useEffect(() => {
    //     const fetch = async () => {
    //       const centerPoint: [number, number] = [47.608013, -122.335167]; // (Seattle)
    //       const radius = 1000; // meters
    //       await fetchAndPredictSoundLevels(centerPoint, radius);
    //     }

    //     fetch();
    // }, []);

    // useEffect(() => {
    //   console.log("Heat Map Updated", heatMapData);
    // }, [heatMapData]);
  
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
            points={heatMapData} // test: [{ latitude: 47.608013, longitude: -122.335167, weight: 35 }, { latitude: 47, longitude: -122.335167, weight: 20 }]
            radius={50}
            opacity={0.7}
            gradient={{
              colors: ['green', 'yellow', 'orange', 'red'],
              startPoints: [0.01, 0.25, 0.5, 1],
              colorMapSize: 200,
            }}
          />
        </MapView>
      </View>
    );
  };
  
export default SoundHeatMap;