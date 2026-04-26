import Sound from "react-native-sound";

Sound.setCategory("Playback");

let tickSound = null;
let winSound = null;
let isLoaded = false;

export const initSounds = () => {
  tickSound = new Sound("tick.mp3", Sound.MAIN_BUNDLE, (e) => {
    if (e) {
      console.log("Tick load error", e);
    } else {
      console.log("Tick loaded");
    }
  });

  winSound = new Sound("win.mp3", Sound.MAIN_BUNDLE, (e) => {
    if (e) {
      console.log("Win load error", e);
    } else {
      console.log("Win loaded");
      isLoaded = true;
    }
  });
};

export const playTick = () => {
  if (!tickSound) return;

  tickSound.stop(() => {
    tickSound.play((success) => {
      if (!success) console.log("Tick failed");
    });
  }); 
};

export const playWin = () => {
  if (!winSound || !isLoaded) {
    console.log("Win sound not ready");
    return;
  }

  winSound.stop(() => {
    winSound.play((success) => {
      if (!success) console.log("Win sound failed");
    });
  });
};

export const releaseSounds = () => {
  tickSound?.release();
  winSound?.release();
};