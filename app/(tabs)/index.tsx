import React, { useState, useEffect, useRef } from 'react';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { StyleSheet, View, Text, Alert, Platform, TextInput } from 'react-native';
import MapView, { Marker, Region, Heatmap, LatLng } from 'react-native-maps';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { TouchableOpacity, GestureHandlerRootView } from 'react-native-gesture-handler';
import { RecordingOptionsPresets } from 'expo-av/build/Audio';

// Heatmap
import { fetchInfrastructure } from './SoundHeatmap';
import SoundmapKey from './SoundmapKey';
import { debounce } from 'lodash';

type WeightedLatLng = LatLng & {
  weight?: number;
};

type AudioMarker = {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  audioUri: string;
  dBFS: number;
};

let record = new Audio.Recording();

export default function HomeScreen() {
  const [region, setRegion] = useState<Region | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [markers, setMarkers] = useState<AudioMarker[]>([]);
  const [coordinate, setCoordinate] = useState<{ latitude: number; longitude: number }>({ latitude: -1, longitude: -1 });
  const [searchText, setSearchText] = useState<string>('');

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
      // let location = await Location.getCurrentPositionAsync({});
      // console.log(location);
      setRegion({
        latitude: 47.608013,
        longitude: -122.335167,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  // GET HEATMAP -----------------------------------------------------------------------------------------------------

  async function renderHeatMap() {
    console.log('rendering');

    var boundaries = await myMap.current?.getMapBoundaries();
    const newLatLng = {
      latitude: 0,
      longitude: 0,
    }
    var swBounds: LatLng = boundaries?.southWest || newLatLng;
    var neBounds: LatLng = boundaries?.northEast || newLatLng;
    console.log("rendering again");
    const tempData = await fetchInfrastructure(swBounds, neBounds);
    if (tempData) {
      // console.log(tempData);
      setHeatMapData(tempData);
    }
  }


  const onRegionChangeComplete = (newRegion: Region) => {
    // debounce(renderHeatMap, 300);
    renderHeatMap();
  };

  const handleButtonPress = async () => {
    if (coordinate.latitude == -1 && coordinate.longitude == -1) {
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
    await startRecording(coordinate);
  };

  const handleUserLocationUpdate = (event: { nativeEvent: any }) => {
    const { nativeEvent } = event;
    setCoordinate({
      latitude: nativeEvent.coordinate.latitude,
      longitude: nativeEvent.coordinate.longitude,
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
      if (pressed) {
        return;
      }
      let samples = 0;
      let total = 0;
      Alert.alert('Recording', 'Recording audio. Press stop to finish.', [
        {
          text: 'Stop',
          onPress: async () => await stopRecording(coordinate, total / samples),
        },
        {
          text: 'Cancel',
          onPress: async () => {
            await record.stopAndUnloadAsync();
          },
        },
      ]);
      const { recording } = await Audio.Recording.createAsync(RecordingOptionsPresets.HIGH_QUALITY);
      record = recording;
      recording.setOnRecordingStatusUpdate((status: Audio.RecordingStatus) => {
        samples++;
        total += status.metering == undefined ? -161 : status.metering;
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
            { coordinate, audioUri: uri, dBFS: avgVolume }, // find dB here
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleMarkerPress = async (audioUri: string, dBFS: number) => {
    pressed = true;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
      await sound.playAsync();
      Alert.alert(
        'Playing',
        'Playing audio (' + Math.round(dBFS * 10.0) / 10.0 + ' dBFS). Press stop to finish.',
        [
          {
            text: 'Stop',
            onPress: async () => sound.stopAsync(),
          },
        ]
      );
    } catch (err) {
      console.error('Failed to play audio', err);
    }
    pressed = false;
  };

  // SEARCH FUNCTIONALITY ------------------------------------------------------------------------------------------------------

  const handleSearch = async () => {
    if (searchText.trim() === '') {
      Alert.alert('Empty Search', 'Please enter a location to search.');
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchText
        )}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'SoundMap/1.0 (your-email@example.com)', // Replace with your app name and email
            'Accept-Language': 'en',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newRegion = {
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        setRegion(newRegion);
        myMap.current?.animateToRegion(newRegion);
      } else {
        Alert.alert('Location not found', 'Please try another location.');
      }
    } catch (error) {
      console.error('Error fetching location', error);
    }
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search for a location"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <MapView
          style={styles.map}
          region={region}
          showsScale={true}
          showsUserLocation={true}
          showsBuildings={true}
          onRegionChangeComplete={onRegionChangeComplete}
          showsPointsOfInterest={true}
          onUserLocationChange={handleUserLocationUpdate}
          ref={myMap}
        >
          {markers.map((marker, index) => (
            <Marker
              key={index}
              coordinate={marker.coordinate}
              onPress={() => handleMarkerPress(marker.audioUri, marker.dBFS)}
            >
              <View
                style={{
                  backgroundColor:
                    marker.dBFS >= -28
                      ? '#ff0000'
                      : marker.dBFS >= -35
                        ? '#ff8f00'
                        : '#007bff',
                  borderRadius: 100,
                  borderWidth: 1,
                  width: 33,
                  height: 33,
                }}
              >
                <TabBarIcon
                  name={
                    marker.dBFS >= -28
                      ? 'volume-high'
                      : marker.dBFS >= -35
                        ? 'volume-medium'
                        : 'volume-low'
                  }
                  color={'white'}
                />
              </View>
            </Marker>
          ))}

          {/* Render heatmap points */}
          <Heatmap
            points={
              heatMapData.length !== 0
                ? heatMapData
                : [
                  {
                    latitude: 47.608013,
                    longitude: -122.335167,
                    weight: 35,
                  },
                  { latitude: 47, longitude: -122.335167, weight: 20 },
                ]
            }
            radius={50}
            opacity={0.7}
            gradient={{
              colors: ['green', 'yellow', 'orange', 'red'],
              startPoints: [0.01, 0.25, 0.5, 1],
              colorMapSize: 200,
            }}
          />
        </MapView>
        <SoundmapKey />
        <View style={{ position: 'absolute', bottom: 20, right: 20 }}>
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
            <TabBarIcon name={'mic'} color={'white'} style={{ fontSize: 50 }} />
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerIcon: {
    width: 40,
    height: 40,
  },
  searchBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    width: '90%',
    alignSelf: 'center',
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 5,
    paddingHorizontal: 10,
    height: 40,
  },
});
