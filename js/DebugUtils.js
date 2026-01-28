export function onLoadStart() {
    console.log('[CustomAudioPlayer] Loading stream...');
}

export function onProgress() {
    const buffered = this.audioElement.buffered;
    if (buffered.length > 0) {
        try {
            const percentage = (buffered.end(buffered.length - 1) / (this.audioElement.duration || 1) * 100).toFixed(1);
            console.log(`[CustomAudioPlayer] Buffered: ${percentage}%`);
        } catch(e) {
            console.log('[CustomAudioPlayer] Buffering...');
        }
    }
}

export function onDurationChange() {
    if (this.audioElement.duration === Infinity) {
        console.log('[CustomAudioPlayer] Live stream detected (infinite duration)');
    } else if (isNaN(this.audioElement.duration)) {
        console.log('[CustomAudioPlayer] Duration unknown - stream may not be responding properly');
    } else {
        console.log(`[CustomAudioPlayer] Duration: ${this.formatTime(this.audioElement.duration)}`);
    }
}

export function onSuspend() {
    console.log('[CustomAudioPlayer] Suspend - playback temporarily suspended');
}

export function onAbort() {
    console.warn('[CustomAudioPlayer] Stream aborted');
}

export function onAudioError(e) {
    const error = this.audioElement.error;
    let errorMsg = 'Unknown error';
    let errorCode = null;
    if (error) {
        errorCode = error.code;
        switch(error.code) {
            case error.MEDIA_ERR_ABORTED: errorMsg = 'Playback aborted'; break;
            case error.MEDIA_ERR_NETWORK: errorMsg = 'Network error - check CORS settings or stream availability'; break;
            case error.MEDIA_ERR_DECODE: errorMsg = 'Decode error - format may not be supported'; break;
            case error.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Stream source not supported'; break;
        }
    }
    console.error('[CustomAudioPlayer] Audio Error (Code ' + errorCode + '):', errorMsg);
    const src = this.audioElement.src || this.audioElement.querySelector('source')?.src;
    console.error('[CustomAudioPlayer] Stream URL:', src);
    console.error('[CustomAudioPlayer] NetworkState:', this.audioElement.networkState);
    console.error('[CustomAudioPlayer] ReadyState:', this.audioElement.readyState);
}

export function onStalled() {
    console.warn('[CustomAudioPlayer] Stream stalled - checking connection...');
    console.warn('[CustomAudioPlayer] NetworkState:', this.audioElement.networkState, '(0=NETWORK_EMPTY, 1=NETWORK_IDLE, 2=NETWORK_LOADING, 3=NETWORK_NO_SOURCE)');
}

export function onCanPlay() {
    console.log('[CustomAudioPlayer] Stream ready to play');
}

export function onPlaying() {
    console.log('[CustomAudioPlayer] Now playing');
}

export function onWaiting() {
    console.log('[CustomAudioPlayer] Waiting for stream data...');
}