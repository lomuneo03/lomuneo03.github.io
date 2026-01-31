/**
 * Custom Audio Player Web Component
 * Provides a stylable audio player with play/pause, progress bar, time display, and volume control
 */

//Module Imports

import { render } from './PlayGUI.js';
import { Utilities, TimeUtilities, DebugUtilities } from './Utils.js';

class CustomAudioPlayer extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.isPlaying = false;
		this.clientConnect = 0; // Time of day client first pressed play/jumpToLive in seconds
		this.clientStart = 0; // Time in the stream duration that the client first pressed play/jumpTolive (for calculating audioElement time)
		this.streamStart = 0; // Time of day stream started
		this.streamDur = 0; // Current duration of stream
		this.worldTime = 0; // Current time
		this.playertime = 0;
		this.duration = 0;

		//Utilities modules
		this.DButils = new DebugUtilities;
		this.Utils = new Utilities;
		this.TUtils = new TimeUtilities;

		//icecast json variables
		this.ICECAST_URL = 'http://dev.motormeme.com:8000/status-json.xsl';
		this.POLL_INTERVAL = 30000;
		console.log('Constructor finished');
	}

	//Defining class fields for imported functions
	
	//Rendering the play bar
	render = () => render.call(this);
	
	//Debug utilities class field imports
	onLoadStart = () => this.DButils.onLoadStart.call(this);
	onProgress = () => this.DButils.onProgress.call(this);
	onDurationChange = () => this.DButils.onDurationChange.call(this);
	onSuspend = () => this.DButils.onSuspend.call(this);
	onAbort = () => this.DButils.onAbort.call(this);
	onAudioError = () => this.DButils.onAudioError.call(this);
	onStalled = () => this.DButils.onStalled.call(this);
	onCanPlay = () => this.DButils.onCanPlay.call(this);
	onPlaying = () => this.DButils.onPlaying.call(this);
	onWaiting = () => this.DButils.onWaiting.call(this);

	//General utilities
	play = () => this.Utils.play.call(this);
	pause = () => this.Utils.pause.call(this);
	setSrc = (src) => this.Utils.setSrc.call(this, src);
	onPlay = () => this.Utils.onPlay.call(this);
	onPause = () => this.Utils.onPause.call(this);
	onTimeUpdate = () => this.Utils.onTimeUpdate.call(this);
	onLoadedMetadata = () => this.Utils.onLoadedMetadata.call(this);
	onEnded = () => this.Utils.onEnded.call(this);
	seek = (e) => this.Utils.seek.call(this, e);
	togglePlayPause = () => this.Utils.togglePlayPause.call(this);

	//Time utilities
	getTimeSecs = () => this.TUtils.getTimeSecs();
	formatTime = (seconds) => this.TUtils.formatTime(seconds);
	getStreamStart = () => this.TUtils.getStreamStart();

	connectedCallback() {
		console.log('[CustomAudioPlayer] connectedCallback fired');
		console.log('[CustomAudioPlayer] Current children:', Array.from(this.children).map(el => `${el.tagName}${el.src ? `(${el.src})` : ''}`));
		
		//initialize functions
		this.render();

		this.TUtils.getStreamStart().then(start => {
			this.streamStart = start;
		});
		
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
		//this.audioElement.addEventListener('canplaythrough', () => this.onCanPlayThrough());
		this.audioElement.addEventListener('loadstart', () => this.onLoadStart());
		this.audioElement.addEventListener('progress', () => this.onProgress());
		this.audioElement.addEventListener('durationchange', () => this.onDurationChange());
		this.audioElement.addEventListener('suspend', () => this.onSuspend());
		this.audioElement.addEventListener('abort', () => this.onAbort());
	}

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

	//Enables or disables the live button functionality based on if the user has fallen 3 or
	//more seconds behind the broadcast. This is done by using an estimate timer that runs
	//in parallel with the stream to estimate where the stream is. I think there could be a
	//better way to do this using icecast status-json data but haven't figured it out yet
	updateLiveButton() {
		const liveBtn = this.shadowRoot.querySelector('.icecast-badge');
		if (!liveBtn || !this.streamStart) return;
		
		console.log(this.streamStart);
		this.worldTime = this.getTimeSecs();
		console.log('getTimeSecs called by updateLiveButton');
		this.streamDur = this.worldTime - this.streamStart;

		if (!this.clientConnect){
			this.clientConnect = this.worldTime - this.streamStart;
			console.log('[CustomAudioPlayer] Set clientConnect:', this.formatTime(this.clientConnect));
		}

		
		const timeBehind = this.streamDur - (this.clientStart + this.audioElement.currentTime);
		const behindThreshold = 5; // Enable button if more than 5 seconds behind
		const isBehind = timeBehind > behindThreshold;
		
		// Log for debugging
		console.log('[CustomAudioPlayer] Live check - Client start:', this.formatTime(this.clientStart), 'Current:', this.formatTime(this.audioElement.currentTime.toFixed(2)), 'Live Edge:', this.formatTime(this.streamDur.toFixed(2)), 'Behind:', this.formatTime(timeBehind.toFixed(2)), 'Stream Start:', this.formatTime(this.streamStart), 'Paused:', this.audioElement.paused);
		
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
		this.worldTime = this.getTimeSecs();
		this.streamDur = this.worldTime - this.streamStart;
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

		// Get the current stream duration by calculating with stream start time
		this.worldTime = this.getTimeSecs();
		console.log('getTimeSecs called by jumpToLive');
		this.streamDur = this.worldTime - this.streamStart;

		console.log('Stream duration: ', this.formatTime(this.streamDur), 'Client start time:', this.formatTime(this.clientStart));
		
		// Jump to the estimated live edge
	
		this.audioElement.currentTime = this.streamDur - this.clientStart - 3;
		console.log('-------------------------------------------------------------------------------------------------')
		console.log('[CustomAudioPlayer] Jumped to live position:', this.formatTime(this.streamDur - 3));
		
		// Resume playback if it was paused
		if (this.audioElement.paused) {
			this.audioElement.play();
		}
	}

	initializeIcecastBadge() {
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
			fetch(this.ICECAST_URL)
				.then(r => r.json())
				.then(data => {
					console.log('Fetch successful, data received');

					//checking if stream is live
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
		setInterval(updateStatus, this.POLL_INTERVAL);
	}
}

// Register the custom element
customElements.define('custom-audio-player', CustomAudioPlayer);
