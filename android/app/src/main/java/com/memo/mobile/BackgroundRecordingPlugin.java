package com.memo.mobile;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundRecording")
public class BackgroundRecordingPlugin extends Plugin {

    @PluginMethod
    public void startKeepAlive(PluginCall call) {
        BackgroundRecordingService.start(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stopKeepAlive(PluginCall call) {
        BackgroundRecordingService.stop(getContext());
        call.resolve();
    }
}
