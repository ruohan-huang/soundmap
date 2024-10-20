import React, { useState, useEffect } from 'react';
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

  // Heatmap
  const [heatMapData, setHeatMapData] = useState<WeightedLatLng[]>([]);

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

  const fetchAndPredictSoundLevels = async (centerPoint: [number, number], radius: number) => {
    const data = await fetchOSMData(centerPoint, radius);
    const predictedSoundLevel = predictSoundLevel(data);
    setHeatMapData(prevData => [
      ...prevData,
      { latitude: centerPoint[0], longitude: centerPoint[1], weight: predictedSoundLevel },
    ]);
  };

  useEffect(() => {
    const centerPoint: [number, number] = [47.608013, -122.335167]; // Seattle coordinates
    const radius = 1000; // 1km radius
    fetchAndPredictSoundLevels(centerPoint, radius);
  }, []);


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
