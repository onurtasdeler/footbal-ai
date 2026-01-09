import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { initCrashlytics } from './src/services/crashlyticsService';

import App from './App';

// Firebase Crashlytics başlat
initCrashlytics();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
