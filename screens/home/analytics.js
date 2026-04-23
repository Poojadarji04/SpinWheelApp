import analytics from '@react-native-firebase/analytics';

// 🔹 App Open (optional)
export const logAppOpen = async () => {
  await analytics().logEvent('app_open_custom');
};

// 🔹 Create Wheel
export const logCreateWheel = async (title, segmentCount) => {
  await analytics().logEvent('create_wheel', {
    wheel_name: title,
    segment_count: segmentCount,
  });
};

// 🔹 Delete Wheel
export const logDeleteWheel = async (title) => {
  await analytics().logEvent('delete_wheel', {
    wheel_name: title,
  });
};


// 🔹 Spin Result (important 🔥)
export const logSpinResult = async (title, result) => {
  await analytics().logEvent('spin_result', {
    wheel_name: title,
    result: result,
  });
};