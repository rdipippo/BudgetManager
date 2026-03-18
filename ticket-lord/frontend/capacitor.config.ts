import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ticketlord.app',
  appName: 'Ticket Lord',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#7C3AED',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#7C3AED',
      showSpinner: false,
    },
  },
};

export default config;
