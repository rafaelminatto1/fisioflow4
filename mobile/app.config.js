const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return 'com.fisioflow.app.dev';
  }
  
  if (IS_PREVIEW) {
    return 'com.fisioflow.app.preview';
  }
  
  return 'com.fisioflow.app';
};

const getAppName = () => {
  if (IS_DEV) {
    return 'FisioFlow (Dev)';
  }
  
  if (IS_PREVIEW) {
    return 'FisioFlow (Preview)';
  }
  
  return 'FisioFlow';
};

export default {
  expo: {
    name: getAppName(),
    slug: 'fisioflow-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      buildNumber: '1.0.0',
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        NSCameraUsageDescription: 'This app uses the camera to upload profile pictures and medical documents.',
        NSPhotoLibraryUsageDescription: 'This app accesses the photo library to upload images and documents.',
        NSMicrophoneUsageDescription: 'This app uses the microphone for voice recording in consultations.',
        NSCalendarsUsageDescription: 'This app accesses your calendar to schedule appointments.',
        NSContactsUsageDescription: 'This app accesses contacts to help you find healthcare providers.',
      }
    },
    android: {
      package: getUniqueIdentifier(),
      versionCode: 1,
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.INTERNET',
        'android.permission.VIBRATE',
        'android.permission.READ_CALENDAR',
        'android.permission.WRITE_CALENDAR'
      ]
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro'
    },
    plugins: [
      'expo-router',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow FisioFlow to access your camera to take photos of medical documents.',
          microphonePermission: 'Allow FisioFlow to access your microphone for voice recordings.',
          recordAudioAndroid: true
        }
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow FisioFlow to access your photos to upload medical documents.'
        }
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
          sounds: [
            './assets/notification-sound.wav'
          ]
        }
      ],
      [
        'expo-calendar',
        {
          calendarPermission: 'Allow FisioFlow to access your calendar to schedule appointments.'
        }
      ],
      [
        'expo-contacts',
        {
          contactsPermission: 'Allow FisioFlow to access your contacts to find healthcare providers.'
        }
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: '34.0.0'
          },
          ios: {
            deploymentTarget: '13.0'
          }
        }
      ]
    ],
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: 'your-eas-project-id'
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://your-backend-url.railway.app',
      environment: process.env.APP_VARIANT || 'production',
    },
    owner: 'your-expo-username',
    runtimeVersion: {
      policy: 'sdkVersion'
    },
    updates: {
      url: 'https://u.expo.dev/your-project-id'
    }
  }
};