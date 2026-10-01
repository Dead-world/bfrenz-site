import { cookies } from 'next/headers';

/** True when the page is being shown inside the Google Play (Android) app. */
export async function inAndroidApp() {
  try {
    const jar = await cookies();
    return jar.get('bfrenz_app')?.value === 'android';
  } catch {
    return false;
  }
}
