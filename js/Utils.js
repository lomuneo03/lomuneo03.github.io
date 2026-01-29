//I can't figure out how to import these into the main script yet so I'm leaving them in
//the main script where the AI put them initially but I want to be able to extract them
//to make the code a little nicer

// Public methods for external control
export function play() {
    this.audioElement.play();
}

export function pause() {
    this.audioElement.pause();
}

export function setSrc(src) {
    const source = this.audioElement.querySelector('source');
    if (source) {
        source.src = src;
    }
    this.audioElement.load();
}

//Called when play button is pressed
export function onPlay() {
    if (this.clientStart == 0) {
        const worldTime = this.getTimeSecs();
        console.log('getTimeSecs called by onPlay');
        this.clientStart = worldTime - this.streamstart;
    }

    console.log('Client started listening:', this.formatTime(this.clientStart));

    this.isPlaying = true;
    const btn = this.shadowRoot.querySelector('.play-pause-btn');
    btn.querySelector('.play-icon').textContent = '⏸';
    btn.style.fontSize = '30px';
    btn.style.bottom = '3px';
    this.dispatchEvent(new CustomEvent('play'));
}

//Called when pause button is pressed
export function onPause() {
    this.isPlaying = false;
    const btn = this.shadowRoot.querySelector('.play-pause-btn');
    btn.querySelector('.play-icon').textContent = '▶';
    btn.style.fontSize = '25px';
    btn.style.bottom = '0px';
    this.dispatchEvent(new CustomEvent('pause'));
}

//For live, this.duration always resolves to "Infinity"
//Only works for static audio files, needs update for live broadcast
export function onTimeUpdate() {
    this.currentTime = this.audioElement.currentTime;
    const percentage = (this.currentTime / this.duration) * 100;
    this.shadowRoot.querySelector('.progress-fill').style.width = percentage + '%';
    this.shadowRoot.querySelector('.current-time').textContent = this.formatTime(this.currentTime);
}

//Broadcast time is given in seconds
//Returns time formatted in Minutes:Seconds
export function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}