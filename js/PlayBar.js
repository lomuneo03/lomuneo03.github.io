/**
 * Custom Audio Player Web Component
 * Provides a stylable audio player with play/pause, progress bar, time display, and volume control
 */

//Module Imports

import { render } from './PlayGUI.js';
import * as DButils from './DebugUtils.js';

class CustomAudioPlayer extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.isPlaying = false;
		this.duration = 0;
		this.currentTime = 0;
		this.maxLiveEdge = 0; // Track the maximum live edge we've seen
		this.lastLiveEdgeTime = 0; // System time when we last updated maxLiveEdge
		this.liveUpdateInterval = null; // Interval for updating live edge while paused
	}

	//Defining class fields for imported functions
	
	//Rendering the play bar
	render = () => render.call(this);

	//Debug utilities class field imports
	onLoadStart = () => DButils.onLoadStart.call(this);
	onProgress = () => DButils.onProgress.call(this);
	onDurationChange = () => DButils.onDurationChange.call(this);
	onSuspend = () => DButils.onSuspend.call(this);
	onAbort = () => DButils.onAbort.call(this);
	onAudioError = () => DButils.onAudioError.call(this);
	onStalled = () => DButils.onStalled.call(this);
	onCanPlay = () => DButils.onCanPlay.call(this);
	onPlaying = () => DButils.onPlaying.call(this);
	onWaiting = () => DButils.onWaiting.call(this);


	connectedCallback() {
		console.log('[CustomAudioPlayer] connectedCallback fired');
		console.log('[CustomAudioPlayer] Current children:', Array.from(this.children).map(el => `${el.tagName}${el.src ? `(${el.src})` : ''}`));
		
		this.render();
		
		// Use a small delay to ensure all child elements are parsed
		// This is necessary because connectedCallback can fire before parser has finished adding child elements
		setTimeout(() => {
			this.setupAudio();
			this.setupEventListeners();
			this.initializeIcecastBadge();
		}, 0);
	}

	setupAudio() {
		console.log('[CustomAudioPlayer] setupAudio() called');
		console.log('[CustomAudioPlayer] this.children:', this.children);
		console.log('[CustomAudioPlayer] this.children.length:', this.children.length);
		
		this.audioElement = this.shadowRoot.querySelector('audio');

		// Get sources from light DOM (direct children of this element)
		const sources = Array.from(this.children).filter(el => {
			const isSource = el.tagName === 'SOURCE';
			console.log(`[CustomAudioPlayer] Checking child: ${el.tagName} - isSource: ${isSource}`);
			return isSource;
		});
		
		console.log(`[CustomAudioPlayer] Found ${sources.length} SOURCE elements`);

		if (sources.length === 0) {
			console.warn('[CustomAudioPlayer] WARNING: No source elements found!');
			console.warn('[CustomAudioPlayer] Element innerHTML:', this.innerHTML);
			
			// Check if there's any HTML at all
			if (this.children.length === 0) {
				console.error('[CustomAudioPlayer] CRITICAL: Element has no children at all!');
				console.error('[CustomAudioPlayer] Make sure <source> tags are inside <custom-audio-player>');
			}
		}

		// Clear any existing sources in shadow DOM
		this.audioElement.querySelectorAll('source').forEach(src => src.remove());

		// Copy sources to shadow DOM audio element
		sources.forEach((source, idx) => {
			const clonedSource = document.createElement('source');
			clonedSource.src = source.src;
			clonedSource.type = source.type;
			clonedSource.setAttribute('crossorigin', 'anonymous');
			this.audioElement.appendChild(clonedSource);
			console.log(`[CustomAudioPlayer] Added source ${idx + 1}: ${source.src} (type: ${source.type})`);
		});

		// Force the audio element to load the sources
		this.audioElement.load();
		console.log('[CustomAudioPlayer] Called audio.load()');

		// Add error handling for network issues
		this.audioElement.addEventListener('error', (e) => this.onAudioError(e));
		this.audioElement.addEventListener('stalled', () => this.onStalled());
		this.audioElement.addEventListener('canplay', () => this.onCanPlay());
		this.audioElement.addEventListener('canplaythrough', () => this.onCanPlayThrough());
		this.audioElement.addEventListener('loadstart', () => this.onLoadStart());
		this.audioElement.addEventListener('progress', () => this.onProgress());
		this.audioElement.addEventListener('durationchange', () => this.onDurationChange());
		this.audioElement.addEventListener('suspend', () => this.onSuspend());
		this.audioElement.addEventListener('abort', () => this.onAbort());
	}
/*
	onLoadStart() {
		console.log('[CustomAudioPlayer] Loading stream...');
	}

	onProgress() {
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

	onDurationChange() {
		if (this.audioElement.duration === Infinity) {
			console.log('[CustomAudioPlayer] Live stream detected (infinite duration)');
		} else if (isNaN(this.audioElement.duration)) {
			console.log('[CustomAudioPlayer] Duration unknown - stream may not be responding properly');
		} else {
			console.log(`[CustomAudioPlayer] Duration: ${this.formatTime(this.audioElement.duration)}`);
		}
	}

	onSuspend() {
		console.log('[CustomAudioPlayer] Suspend - playback temporarily suspended');
	}

	onAbort() {
		console.warn('[CustomAudioPlayer] Stream aborted');
	}

	onAudioError(e) {
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

	onStalled() {
		console.warn('[CustomAudioPlayer] Stream stalled - checking connection...');
		console.warn('[CustomAudioPlayer] NetworkState:', this.audioElement.networkState, '(0=NETWORK_EMPTY, 1=NETWORK_IDLE, 2=NETWORK_LOADING, 3=NETWORK_NO_SOURCE)');
	}

	onCanPlay() {
		console.log('[CustomAudioPlayer] Stream ready to play');
	}

	onPlaying() {
		console.log('[CustomAudioPlayer] Now playing');
	}

	onWaiting() {
		console.log('[CustomAudioPlayer] Waiting for stream data...');
	}
*/
	setupEventListeners() {
		const playPauseBtn = this.shadowRoot.querySelector('.play-pause-btn');
		const progressBar = this.shadowRoot.querySelector('.progress-bar');
		const liveBtn = this.shadowRoot.querySelector('.icecast-badge');

		// Play/Pause
		playPauseBtn.addEventListener('click', () => this.togglePlayPause());

		// Live button - jump to current stream position
		liveBtn.addEventListener('click', () => this.jumpToLive());

		// Audio events
		this.audioElement.addEventListener('play', () => {
			this.onPlay();
			this.updateLiveButton();
		});
		this.audioElement.addEventListener('pause', () => {
			this.onPause();
			this.updateLiveButton();
		});
		this.audioElement.addEventListener('timeupdate', () => {
			this.onTimeUpdate();
			this.updateLiveButton();
		});
		this.audioElement.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
		this.audioElement.addEventListener('ended', () => this.onEnded());
		this.audioElement.addEventListener('playing', () => this.onPlaying());
		this.audioElement.addEventListener('waiting', () => this.onWaiting());
		this.audioElement.addEventListener('progress', () => this.updateLiveButton());

		// Progress bar click
		progressBar.addEventListener('click', (e) => this.seek(e));

		// Keyboard shortcuts
		this.addEventListener('keydown', (e) => {
			if (e.code === 'Space') {
				e.preventDefault();
				this.togglePlayPause();
			}
		});

		// Log initial state
		console.log('[CustomAudioPlayer] Initialized');
		const srcElements = this.audioElement.querySelectorAll('source');
		srcElements.forEach((src, idx) => {
			console.log(`[CustomAudioPlayer] Source ${idx + 1}: ${src.src} (${src.type})`);
		});
	}

	//Toggles play/pause
	//Includes debug codes first
	//Usees a promise to check success
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
		this.isPlaying = true;
		const btn = this.shadowRoot.querySelector('.play-pause-btn');
		btn.querySelector('.play-icon').textContent = '⏸';
		btn.style.fontSize = '30px';
		btn.style.bottom = '3px';
		this.dispatchEvent(new CustomEvent('play'));
	}

	//Called when pause button is pressed
	onPause() {
		this.isPlaying = false;
		const btn = this.shadowRoot.querySelector('.play-pause-btn');
		btn.querySelector('.play-icon').textContent = '▶';
		btn.style.fontSize = '25px';
		btn.style.bottom = '0px';
		this.dispatchEvent(new CustomEvent('pause'));
	}

	//For live, this.duration always resolves to "Infinity"
	//Only works for static audio files, needs update for live broadcast
	onTimeUpdate() {
		this.currentTime = this.audioElement.currentTime;
		const percentage = (this.currentTime / this.duration) * 100;
		this.shadowRoot.querySelector('.progress-fill').style.width = percentage + '%';
		this.shadowRoot.querySelector('.current-time').textContent = this.formatTime(this.currentTime);
	}

	//Mainly useful for static audio files, sets duration time to -:-- if it's a livestream
	onLoadedMetadata() {
		this.duration = this.audioElement.duration;
		console.log('Duration debug:', this.duration);
		
		if (this.duration == 'Infinity'){
			this.shadowRoot.querySelector('.duration-time').textContent = '-:--';
		} else {
			this.shadowRoot.querySelector('.duration-time').textContent = this.formatTime(this.duration);
		}

		//this.shadowRoot.querySelector('.duration-time').textContent = this.formatTime(this.duration);
	}

	onEnded() {
		this.dispatchEvent(new CustomEvent('ended'));
	}

	seek(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		this.audioElement.currentTime = percent * this.duration;
	}

	//Broadcast time is given in seconds
	//Returns time formatted in Minutes:Seconds
	formatTime(seconds) {
		if (!seconds || isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}


	updateLiveButton() {
		const liveBtn = this.shadowRoot.querySelector('.icecast-badge');
		if (!liveBtn) return;

		const buffered = this.audioElement.buffered;
		if (buffered.length > 0) {
			// Get the current live edge from buffered data
			const currentBufferedEdge = buffered.end(buffered.length - 1);
			
			// Update our tracked max live edge and timestamp (represents server's actual position)
			if (currentBufferedEdge > this.maxLiveEdge) {
				this.maxLiveEdge = currentBufferedEdge;
				this.lastLiveEdgeTime = Date.now();
			}
		}
		
		// Estimate the live edge by adding elapsed time since we last knew it
		const elapsedSeconds = (Date.now() - this.lastLiveEdgeTime) / 1000;
		const estimatedLiveEdge = this.maxLiveEdge + elapsedSeconds;
		
		const currentTime = this.audioElement.currentTime;
		const timeBehind = estimatedLiveEdge - currentTime;
		const behindThreshold = 3; // Enable button if more than 3 seconds behind
		const isBehind = timeBehind > behindThreshold;
		
		// Log for debugging
		console.log('[CustomAudioPlayer] Live check - Current:', currentTime.toFixed(2), 'Live Edge (Est):', estimatedLiveEdge.toFixed(2), 'Behind:', timeBehind.toFixed(2), 'Paused:', this.audioElement.paused);
		
		// Disable button if live, enable if behind
		liveBtn.disabled = !isBehind;

		if (liveBtn.disabled){
			// User is caught up with the stream
			liveBtn.classList.remove('offline', 'live');
			liveBtn.classList.add('caught-up');
			console.log('Caught up!');
		} else {
			// User is behind the stream
			liveBtn.classList.remove('caught-up');
			liveBtn.classList.add('live');
		}
	}

	jumpToLive() {
		// Use the same estimated live edge calculation as updateLiveButton
		const elapsedSeconds = (Date.now() - this.lastLiveEdgeTime) / 1000;
		const estimatedLiveEdge = this.maxLiveEdge + elapsedSeconds;
		
		// Jump to the estimated live edge
		this.audioElement.currentTime = estimatedLiveEdge;
		console.log('[CustomAudioPlayer] Jumped to live position:', this.formatTime(estimatedLiveEdge));
		
		// Resume playback if it was paused
		if (this.audioElement.paused) {
			this.audioElement.play();
		}
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

	initializeIcecastBadge() {
		const ICECAST_URL = 'http://dev.motormeme.com:8000/status-json.xsl';
		const POLL_INTERVAL = 30000;
		const badge = this.shadowRoot.querySelector('.icecast-status-badge');
		
		if (!badge) return; // Badge not in DOM

		const mountpoint = badge.dataset.mountpoint; // e.g., "/lomuneo"
		
		function isStreamLive(data, mount) {
			if (!data.icestats || !data.icestats.source) return false;
			const sources = Array.isArray(data.icestats.source)
				? data.icestats.source
				: [data.icestats.source];
			return sources.some(s => s.listenurl && s.listenurl.endsWith(mount));
		}

		const updateStatus = () => {
			fetch(ICECAST_URL)
				.then(r => r.json())
				.then(data => {
					const isLive = isStreamLive(data, mountpoint);
					const badgeEl = badge.querySelector('.icecast-badge');
					if (badgeEl) {
						badgeEl.className = isLive ? 'icecast-badge live' : 'icecast-badge offline';
					}
				})
				.catch(() => {
					const badgeEl = badge.querySelector('.icecast-badge');
					if (badgeEl) {
						badgeEl.className = 'icecast-badge offline';
					}
				});
		};

		updateStatus();
		setInterval(updateStatus, POLL_INTERVAL);
	}
}

// Register the custom element
customElements.define('custom-audio-player', CustomAudioPlayer);
