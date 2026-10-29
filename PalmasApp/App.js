import React, { useState } from 'react';
import { View, I18nManager } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { AppProvider, useApp } from './src/store';
import { palette, BRAND } from './src/theme';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import MapScreen from './src/screens/MapScreen';
import SavedScreen from './src/screens/SavedScreen';
import AccountScreen from './src/screens/AccountScreen';
import PropertyScreen from './src/screens/PropertyScreen';
import ProjectScreen from './src/screens/ProjectScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import ContactScreen from './src/screens/ContactScreen';
import ListPropertyScreen from './src/screens/ListPropertyScreen';
import AccountSettingsScreen from './src/screens/AccountSettingsScreen';
import AuthScreen from './src/screens/AuthScreen';

try { I18nManager.allowRTL(true); } catch (e) {}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

/* the four tabs the prototype ships with: Home · Explore · Map · Account
   (Saved lives behind the heart in the header, exactly like the design) */
const ICONS = {
  Home: ['home', 'home-outline'],
  Explore: ['search', 'search-outline'],
  MapTab: ['map', 'map-outline'],
  Account: ['person', 'person-outline'],
};

function Tabs() {
  const { theme, t } = useApp();
  const p = palette(theme);
  const insets = useSafeAreaInsets();
  const labels = { Home: t.navHome, Explore: t.navExplore, MapTab: t.navMap, Account: t.navAccount };

  /* Lift the bar clear of the system gesture bar, otherwise the navigation pill draws
     straight through the Arabic labels. The inset is 0 on devices without one. */
  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: BRAND.main,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: {
          backgroundColor: p.card,
          borderTopColor: p.hair,
          height: 60 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarItemStyle: { paddingVertical: 2 },
        /* Arabic needs the extra line box or the labels get clipped */
        tabBarLabelStyle: { fontSize: 10.5, lineHeight: 16, fontWeight: '800' },
        tabBarLabel: labels[route.name],
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = ICONS[route.name];
          return <Ionicons name={focused ? on : off} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="MapTab" component={MapScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready, theme, lang } = useApp();
  const [splashDone, setSplashDone] = useState(false);
  const p = palette(theme);

  const navTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: p.page,
      card: p.card,
      text: p.head,
      border: p.hair,
      primary: BRAND.main,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.page }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Property" component={PropertyScreen} />
          <Stack.Screen name="Project" component={ProjectScreen} />
          <Stack.Screen name="Projects" component={ProjectsScreen} />
          <Stack.Screen name="Contact" component={ContactScreen} />
          <Stack.Screen name="ListProperty" component={ListPropertyScreen} />
          <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
          <Stack.Screen name="Saved" component={SavedScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ animation: 'slide_from_bottom' }} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* the shared core hydrates behind the splash, so the first screen already has data */}
      {(!ready || !splashDone) && <SplashScreen lang={lang} onDone={() => setSplashDone(true)} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
