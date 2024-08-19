import React, { useState, useEffect } from 'react';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { StyleSheet, View, Text, Button, Alert, Image } from 'react-native';
import MapView, { Marker, MapPressEvent, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { TouchableOpacity, GestureHandlerRootView} from 'react-native-gesture-handler';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality, IOSOutputFormat, RecordingOptionsPresets } from 'expo-av/build/Audio';




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
        </MapView>
        <View style={{top: 360, right: -160}}>
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
