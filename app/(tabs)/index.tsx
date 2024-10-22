import React, { useState, useEffect, useRef } from 'react';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { StyleSheet, View, Text, Button, Alert, Image } from 'react-native';
import MapView, { Marker, MapPressEvent, Region, Heatmap, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { TouchableOpacity, GestureHandlerRootView} from 'react-native-gesture-handler';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality, IOSOutputFormat, RecordingOptionsPresets } from 'expo-av/build/Audio';

// Heatmap
import { predictSoundLevel, fetchOSMData } from './SoundHeatMap';

type WeightedLatLng = LatLng & {
  weight?: number;
};

type AudioMarker = {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  audioUri: string;
  dBFS : number;
};
let record = new Audio.Recording();
export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [markers, setMarkers] = useState<AudioMarker[]>([]);
  const [coordinate, setCoordinate] = useState<{latitude: number, longitude: number}>({latitude: -1, longitude: -1});

  // Heatmap variables
  const [heatMapData, setHeatMapData] = useState<WeightedLatLng[]>([]);
  const myMap = useRef<MapView>(null);

  let pressed = false;
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      //console.log(location);
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);


  // GET DISTANCE AND DIVISIONS -----------------------------------------------------------------------------------------------------

  async function getMapDimensions() {
    var bounds = await myMap.current?.getMapBoundaries();
    var topRight = bounds?.northEast; // LatLng of top right corner of map
    var bottomLeft = bounds?.southWest; // LatLng of bottom left corner of map

    var trLat: number = topRight?.latitude || 0;
    var trLon: number = topRight?.longitude || 0;
    var blLat: number = bottomLeft?.latitude || 0;
    var blLon: number = bottomLeft?.latitude || 0;

    return [distanceBetweenLatitudes(trLat, blLat), distanceBetweenLongitudes(trLat, trLon, blLat, blLon)];
  }

  function distanceBetweenLatitudes(lat1: number, lat2: number) {
    const earthRadius = 6371; // Earth's radius in kilometers
    const deltaLat = Math.abs(lat2 - lat1); // Difference in latitude in degrees

    // Convert deltaLat to radians
    const deltaLatRad = deltaLat * (Math.PI / 180);

    // Calculate distance
    const distance = earthRadius * deltaLatRad;
    return distance;
  }

  function distanceBetweenLongitudes(lat1: number, lon1: number, lat2: number, lon2: number) {
    const earthRadius = 6371; // Earth's radius in kilometers
    const deltaLon = Math.abs(lon2 - lon1); // Difference in latitude in degrees

    // Convert deltaLat to radians
    const deltaLonRad = deltaLon * (Math.PI / 180);

    // Calculate distance
    const distance = earthRadius * Math.cos(distanceBetweenLatitudes(lat1, lat2) * (Math.PI / 180)) * deltaLonRad;
    return distance;
  }

  function divideLatitudes(lat1: number, lat2: number, numParts: number) {
    const deltaLat = Math.abs(lat2 - lat1); // difference in latitudes
    const stepSize = deltaLat / numParts; // step size for each part
    const latitudes = [];
  
    for (let i = 0; i <= numParts; i++) {
      // calculate latitude at each step
      const newLat = lat1 + i * stepSize;
      latitudes.push(newLat);
    }
  
    return latitudes;
  }

  function divideLongitudes(lon1: number, lon2: number, lat: number, numParts: number) {
    const earthRadius = 6371; // Earth's radius in kilometers

    // Convert latitude to radians
    const latRad = lat * (Math.PI / 180);

    // Calculate the distance between longitudes using the formula:
    // distance = radius * cos(latitude) * difference in longitude
    const deltaLon = Math.abs(lon2 - lon1); // difference in longitude in degrees
    const stepSize = deltaLon / numParts; // step size for each part
    const longitudes = [];
  
    for (let i = 0; i <= numParts; i++) {
      // Calculate the longitude at each step
      const newLon = lon1 + i * stepSize;
      longitudes.push(newLon);
    }
  
    return longitudes;
  }

  

  // const fetchAndPredictSoundLevels = async (latitudes: number[], longitudes: number[], radius: number) => {
  //   const data = await fetchOSMData(latitudes, longitudes, radius);
  //   return data;
  // };

  
  // useEffect(() => {
  //   const centerPoint: [number, number] = [47.608013, -122.335167]; // Seattle coordinates
  //   const radius = 1000; // 1km radius
  //   // fetchAndPredictSoundLevels(centerPoint, radius);
  // }, []);


  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
  };

  const handleButtonPress = async () => {
    if (coordinate.latitude == -1 && coordinate.longitude == -1){
      Alert.alert('Fetching Location', 'Move around for better accuracy!', [
        {
          text: 'Ok',
        },
      ]);
      return;
    }
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      return;
    }
   // let location = await Location.getCurrentPositionAsync({});
    await startRecording(coordinate);
  };

  const handleUserLocationUpdate = (event: { nativeEvent: any; }) => {
    const {nativeEvent} = event;
    setCoordinate({
      latitude: nativeEvent.coordinate.latitude,
      longitude: nativeEvent.coordinate.longitude
    });
  };


// RECORDING ---------------------------------------------------------------------------------------------------------------

  const startRecording = async (coordinate: { latitude: number; longitude: number }) => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setErrorMsg('Permission to access audio was denied');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      if (pressed){
        return;
      }
      let samples = 0;
      let total = 0;
      Alert.alert('Recording', 'Recording audio. Press stop to finish.', [
        {
          text: 'Stop',
          onPress: async () => await stopRecording(coordinate, total/samples),
        },
        {
          text: 'Cancel',
          onPress: async () => {await record.stopAndUnloadAsync()},
        },
      ]);
      const { recording } = await Audio.Recording.createAsync(RecordingOptionsPresets.HIGH_QUALITY);
      record = recording;
      recording.setOnRecordingStatusUpdate((status: Audio.RecordingStatus)=> {
          samples ++;
          total += status.metering == undefined ? -161 : status.metering;
          //console.log('Average Volume: ' + (total/samples))
      });
    } catch (err) {
      
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async (coordinate: { latitude: number; longitude: number }, avgVolume: number) => {
    try {
      if (record) {
        console.log(avgVolume);
        await record.stopAndUnloadAsync();
        const uri = record.getURI();
        if (uri) {
          setMarkers((prevMarkers) => [
            ...prevMarkers,
            { coordinate, audioUri: uri , dBFS: avgVolume}, //find dB here
          ]);
        }
        //record = undefined;
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleMarkerPress = async (audioUri: string, dBFS : number) => {
    pressed = true;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.playAsync();
      Alert.alert('Playing', 'Playing audio (' + Math.round(dBFS * 10.0)/10.0  +  ' dBFS). Press stop to finish.', [
        {
          text: 'Stop',
          onPress: async () => sound.stopAsync(),
        },
      ]);
    } catch (err) {
      console.error('Failed to play audio', err);
    }
    pressed = false;
  };

  if (!region) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
        {errorMsg ? <Text>{errorMsg}</Text> : null}
      </View>
    );
  }


  return (
    <GestureHandlerRootView>
      <View style={styles.container}>
        <MapView
          // provider={'google'} // changed - error now
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsBuildings={true}
          onRegionChangeComplete={onRegionChangeComplete}
          onUserLocationChange={handleUserLocationUpdate}
          ref={myMap}
          //onPress={handleMapPress}
        >
          {markers.map((marker, index) => (
              <Marker
                key={index}
                coordinate={marker.coordinate}
                onPress={() => handleMarkerPress(marker.audioUri, marker.dBFS)}
              >
                <View style={{
                  backgroundColor: marker.dBFS >= -28 ? '#ff0000' :  marker.dBFS >= -35 ? '#ff8f00': '#007bff',
                  borderRadius: 100,
                  borderWidth: 1,
                  width: 33,
                  height: 33, 
                }}>
                  <TabBarIcon name={marker.dBFS >= -28 ? 'volume-high' : marker.dBFS >= -35 ? 'volume-medium' : 'volume-low'} color={'white'}  />
                </View>
              </Marker>
          ))}

          {/* Render heatmap points */}
          <Heatmap
            points={[{ latitude: 47.608013, longitude: -122.335167, weight: 35 }, { latitude: 47, longitude: -122.335167, weight: 20 }]}
            radius={50}
            opacity={0.7}
            gradient={{
              colors: ['green', 'yellow', 'orange', 'red'],
              startPoints: [0.01, 0.25, 0.5, 1],
              colorMapSize: 200,
            }}
          />
        </MapView>
        <View style={{top: 320, right: -130}}>
          <TouchableOpacity
            style={{
            backgroundColor: '#007bff',
            padding: 10,
            borderRadius: 100,
            borderWidth: 1,
            width: 80,
            height: 80, 
            borderColor: 'black',
            alignItems: 'center',
            justifyContent: 'center',
          }}
            onPress={handleButtonPress}
          >
            <TabBarIcon
              name={'mic'}
              color={'white'}
              style={{fontSize: 50 }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>

  );
}

  


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerIcon: {
    width: 40,
    height: 40,
  },
});
