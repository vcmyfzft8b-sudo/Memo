"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

type BackgroundRecordingPlugin = {
  startKeepAlive: () => Promise<void>;
  stopKeepAlive: () => Promise<void>;
};

const BackgroundRecording = registerPlugin<BackgroundRecordingPlugin>(
  "BackgroundRecording",
);

export function isNativePlatform() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function isNativeAndroid() {
  return isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function startNativeRecordingKeepAlive() {
  if (!isNativeAndroid()) {
    return;
  }

  await BackgroundRecording.startKeepAlive();
}

export async function stopNativeRecordingKeepAlive() {
  if (!isNativeAndroid()) {
    return;
  }

  await BackgroundRecording.stopKeepAlive();
}
