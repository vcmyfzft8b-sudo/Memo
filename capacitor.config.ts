import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memo.mobile',
  appName: 'Memo',
  webDir: 'mobile-shell',
  server: {
    url: process.env.CAPACITOR_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    cleartext: true,
  },
};

export default config;
