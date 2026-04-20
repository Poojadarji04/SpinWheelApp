import {
  InterstitialAd,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

const adUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-xxxxxxxx/xxxxxxxx';

export const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export function loadInterstitial() {
  interstitial.load();
}