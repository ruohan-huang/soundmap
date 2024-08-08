import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Image, Platform } from 'react-native';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Dimensions, View } from 'react-native';


export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={<Image source={require('@/assets/images/seattle.png')} style={styles.headerImage} />}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explore</ThemedText>
      </ThemedView>
      <ThemedText>Welcome to our noise pollution map! Click below to get started!</ThemedText>
      <Collapsible title="Context and Introduction">
        <ThemedText>
          The world is becoming more urbanized since the industrial revolution. Living in an urbanized world, you can hear noises,
          known as sound pollution, in many places. These noises, despite being seemingly harmless, can have a 
          major impact on people's health and well-being. 
        </ThemedText>
      </Collapsible>
      <Collapsible title="Why bother the sound level?">
        <ThemedText>
          How can one bear having insomnia from traffic noises? Sound can contribute to one's daily life, including work, 
          sleep, relaxation, and everything else. Combined, these affected aspects can lead to a bad mood. Moreover, noise 
          can cause a variety of health problems, including hearing loss and cardiovascular problems. Knowing the effects of
          noise, we created a map where one can see the noise level in everywhere.  
        </ThemedText>    
        <Image source={require('@/assets/images/jackhammer.png')} style={{ alignSelf: 'center', width: 300, height: 200, marginTop: 10, borderRadius: 10}} />
      </Collapsible>
      <Collapsible title="Our Mission">
        <ThemedText>
          Our goal is to provide people with a map of different noise pollution levels. Thanks to our thoughtful member
          Ruohan Huang, this idea is brought into our awareness. Using this novel tool, people (especially
          those sensitive to sound) will be able to know their surroundings, whether at home, moving, or travelling. 
        </ThemedText>  
      </Collapsible>
      <Collapsible title="App Functionalities">
        <ThemedText>
        This app uses crowdsourced data!  Click on {' \n'}
          <View
            style={{
            backgroundColor: '#007bff',
            padding: 10,
            borderRadius: 100,
            borderWidth: 1,
            width: 50,
            height: 50, 
            borderColor: 'black',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          >
            <TabBarIcon
              name={'mic'}
              color={'white'}
              style={{fontSize: 30 }}
            />
          </View>
          {' '} to record the noise around you. You must give us access to your location and microphone! Once recorded, 
          people can hear your recording. Click on any {' '}
          <View style={{
                  backgroundColor: '#007bff',
                  borderRadius: 100,
                  borderWidth: 1,
                  width: 33,
                  height: 33, 
                }}>
                  <TabBarIcon name={'volume-high'} color={'white'}  />
          </View>
          {' '} to hear the recording!
        </ThemedText>
      </Collapsible>
      <Collapsible title="Conclusion">
        <ThemedText>
          We hope that our tool will help you, whether sensitive to noise or not. In the end, we wish you would enjoy 
          your current environment or find a more suitable one. Good luck!
        </ThemedText>
      </Collapsible>
      <Collapsible title="Works Cited">
        <ThemedText>
        Parris, Josh. jackhammer. Encyclopædia Britannica, Encyclopædia Britannica, https://www.britannica.com/science/noise-pollution/images-videos#/media/1/417205/128720. Accessed 8 Aug. 2024. 
        </ThemedText>
        <ThemedText style={{marginTop: 6}}>
        Muench, David, and Encyclopædia Britannica. Seattle. Encyclopædia Britannica, Encyclopædia Britannica, https://www.britannica.com/place/Seattle-Washington#/media/1/531107/212117. Accessed 8 Aug. 2024. 
        </ThemedText>
        <ThemedText style={{marginTop: 6}}>
        Berg, Richard E. and Nathanson, Jerry A.. "noise pollution". Encyclopedia Britannica, 22 Jul. 2024, https://www.britannica.com/science/noise-pollution. Accessed 8 August 2024. 
        </ThemedText>
      </Collapsible>
      <ExternalLink href="https://www.britannica.com/science/noise-pollution">
          <ThemedText type="link">Click to learn more</ThemedText>
        </ExternalLink>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    width: Dimensions.get('window').width,
    height: 0.3 * Dimensions.get('window').height,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
