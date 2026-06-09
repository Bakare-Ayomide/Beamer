import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.localfileshare.app',
  appName: 'Local File Share',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
