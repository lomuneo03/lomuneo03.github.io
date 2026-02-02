
class Utilities{
    constructor() {
        //these are only used in unused functions for seeking, setting duration of audiofile, etc.
        //unless we load audio files in between broadcast these could potentially be removed
        this.playertime = 0;
        this.duration = 0;
    }

    // Public methods for external control
    play() {
        this.audioElement.play();
    }

    pause() {
        this.audioElement.pause();
    }

    setSrc(src) {
        const source = this.audioElement.querySelector('source');
        if (source) {
            source.src = src;
        }
        this.audioElement.load();
    }

    //Toggles play/pause
	//Includes debug codes first
	//Uses a promise to check success
	togglePlayPause() {

		if (this.audioElement.paused) {
			console.log('[CustomAudioPlayer] Attempting to play...');
			console.log('[CustomAudioPlayer] ReadyState:', this.audioElement.readyState, '(0=NOTHING, 1=METADATA, 2=CURRENT, 3=FUTURE, 4=ENOUGH)');
			console.log('[CustomAudioPlayer] NetworkState:', this.audioElement.networkState, '(0=EMPTY, 1=IDLE, 2=LOADING, 3=NO_SOURCE)');
			console.log('[CustomAudioPlayer] Current time:', this.audioElement.currentTime);

			const playPromise = this.audioElement.play();

			//Promise returns either a value or undefined, .then and .catch execute based on this result
			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						console.log('[CustomAudioPlayer] Play succeeded');
					})
					.catch(error => {
						console.error('[CustomAudioPlayer] Play failed:', error.message);
						console.error('[CustomAudioPlayer] Error name:', error.name);
					});
			}
		} else {
			console.log('[CustomAudioPlayer] Pausing');
			this.audioElement.pause();
		}
	}

    //Called when play button is pressed
    onPlay() {
        //Setting key values for keeping track of where the client player and the stream are
        //worldTime is the current time (EST)
        this.worldTime = this.getTimeSecs();
        //streamDur is the current duration of the stream
		this.streamDur = this.worldTime - this.streamStart;
		
        //clientConnect is when the page loaded the stream, only used in debugging currently
        //clientStart is when the listener first presses play or the live button (which is 
        //the same as play when you first load)

        //clientStart is critical; used to calculate how far behind the listeners client is
        //and also used to calculate what to set the player time to when they want to catch
        //up
        if (!this.clientConnect){
			this.clientConnect = this.worldTime - this.streamStart;
			this.clientStart = this.streamDur;
			console.log('[CustomAudioPlayer] Set clientConnect:', this.formatTime(this.clientConnect));
			if (this.clientStart != 0){
				console.log('[CustomAudioPlayer] clientStart sucess:', this.formatTime(this.clientStart));
			} else {
				console.log('[CustomAudioPlayer] clientStart failed:', this.formatTime(this.clientStart));
			}
			console.log('[CustomAudioPlayer] WorldTime:', this.formatTime(this.worldTime), 'streamStart:', this.formatTime(this.streamStart));
		} else if (!this.clientStart){
			this.clientStart = this.streamDur;
			console.log('[CustomAudioPlayer] Set clientStart:', this.formatTime(this.clientStart)); 
			console.log('[CustomAudioPlayer] WorldTime:', this.formatTime(this.worldTime), 'streamStart:', this.formatTime(this.streamStart), 'clientConnect:', this.formatTime(this.clientConnect));
		}

        console.log('Client started listening:', this.formatTime(this.clientConnect));

        this.isPlaying = true;
        const btn = this.shadowRoot.querySelector('.play-pause-btn');
        btn.querySelector('.play-icon').src = '../Content/Pause.png';
        this.dispatchEvent(new CustomEvent('play'));
    }

    //Called when pause button is pressed
    onPause() {
        this.isPlaying = false;
        const btn = this.shadowRoot.querySelector('.play-pause-btn');
        btn.querySelector('.play-icon').src = '../Content/Play.png';
        this.dispatchEvent(new CustomEvent('pause'));
    }

    //Sets timecodes in the player
    //For live, this.duration always resolves to "Infinity"
    //Only works for static audio files, needs update for live broadcast
    onTimeUpdate() {
        this.playertime = this.audioElement.currentTime;
        const percentage = (this.playertime / this.duration) * 100;
        this.shadowRoot.querySelector('.progress-fill').style.width = percentage + '%';
        this.shadowRoot.querySelector('.current-time').textContent = this.formatTimeLive(this.playertime);
    }

    //somewhat useless functions that will become useful if static files are to be played in place of
    //a broadcast

    //Mainly useful for static audio files, sets duration time to --:--:-- if it's a livestream
	onLoadedMetadata() {
		this.duration = this.audioElement.duration;
		console.log('Duration debug:', this.duration);
		
		if (this.duration == 'Infinity'){
			this.shadowRoot.querySelector('.duration-time').textContent = '-:--:--';
		} else {
			this.shadowRoot.querySelector('.duration-time').textContent = this.formatTime(this.duration);
		}
	}

	//This doesnt seem to do anything... creates a new custom event 'ended' but this is only
	//refrenced above at 141 in setupEventListeners and I can't find anywhere that the event
	//is referenced to create a behavior. Will leave in case I'm wrong in some way
	onEnded() {
		this.dispatchEvent(new CustomEvent('ended'));
	}

	//I believe this is used to seek with the playbar, but it doesn't work and I don't
	//think I need it anyway, but I'll leave it until I can figure out for sure
	seek(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		this.audioElement.currentTime = percent * this.duration;
	}

}
export { TimeUtilities } from './TimeUtils.js';
export { DebugUtilities } from './DebugUtils.js';
export { Utilities };