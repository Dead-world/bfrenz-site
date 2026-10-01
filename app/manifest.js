// The web app manifest (/manifest.webmanifest). It makes BFRENZ installable on phones
// and is what PWABuilder reads to build the Google Play app.
export default function manifest() {
  return {
    id: '/',
    name: 'BFRENZ',
    short_name: 'BFRENZ',
    description: 'Your page, your Top 8, your song. The social network that brings the fun back.',
    start_url: '/home?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b0b0c',
    theme_color: '#0b0b0c',
    categories: ['social', 'entertainment', 'music'],
    lang: 'en-US',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Feed', url: '/home', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Mail', url: '/mail', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Edit Profile', url: '/edit', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
