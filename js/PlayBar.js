/**
 * Custom Audio Player Web Component
 * Provides a stylable audio player with play/pause, progress bar, time display, and volume control
 */

//Module Imports

import { render } from './PlayGUI.js';
import * as DButils from './DebugUtils.js';
import * as Utils from './Utils.js';

class CustomAudioPlayer extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.isPlaying = false;
		this.duration = 0;
		this.currentTime = 0;
		this.clientStart = 0; // Time of day client first pressed play/jumpToLive in seconds
		this.clientTime = 0; // Current time in the broadcast for the client
		this.streamStart = 0; // Time of day stream started
		this.streamDur = 0; // Current duration of stream

		//icecast json variables
		this.ICECAST_URL = 'http://dev.motormeme.com:8000/status-json.xsl';
		this.POLL_INTERVAL = 30000;
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

	//General utilities
	play = () => Utils.play();
	pause = () => Utils.pause();
	setSrc = (src) => Utils.setSrc(src);
	formatTime = (seconds) => Utils.formatTime(seconds);


	connectedCallback() {
		console.log('[CustomAudioPlayer] connectedCallback fired');
		console.log('[CustomAudioPlayer] Current children:', Array.from(this.children).map(el => `${el.tagName}${el.src ? `(${el.src})` : ''}`));
		
		//General utilities
		//play() = () => Utils.play(this);
		
		//initialize functions
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
			this.shadowRoot.querySelector('.duration-time').textContent = '--:--';
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

	// Returns EST time converted to seconds
	// Server runs on EST time so this is useful for a number of things
	getTimeSecs() {
		try {
			console.log('getTimeSecs called');
			const now = new Date();
			
			// Format with timezone and parse the result manually
			const estString = now.toLocaleString('en-US', { 
				timeZone: 'America/New_York',
				hour12: false,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
			
			// Parse the formatted string: "MM/DD/YYYY, HH:mm:ss"
			const parts = estString.split(/[\/,:\s]+/);
			const hours = parseInt(parts[3]);
			const minutes = parseInt(parts[4]);
			const seconds = parseInt(parts[5]);
			
			//console.log('Parsed EST - Hours:', hours, 'Minutes:', minutes, 'Seconds:', seconds);
			
			let secTime = (hours * (60 * 60) + (minutes * 60) + seconds);
			//console.log('Time in seconds:', secTime);

			return secTime;
		} catch (err) {
			console.error('Error in getTimeSecs:', err);
			// Fallback: use local time
			const now = new Date();
			const hours = now.getHours();
			const minutes = now.getMinutes();
			const seconds = now.getSeconds();
			const secTime = (hours * (60 * 60) + (minutes * 60) + seconds);
			console.log('Using fallback local time:', secTime);
			return secTime;
		}
	}

	//Enables or disables the live button functionality based on if the user has fallen 3 or
	//more seconds behind the broadcast. This is done by using an estimate timer that runs
	//in parallel with the stream to estimate where the stream is. I think there could be a
	//better way to do this using icecast status-json data but haven't figured it out yet
	updateLiveButton() {
		const liveBtn = this.shadowRoot.querySelector('.icecast-badge');
		if (!liveBtn) return;

		this.streamDuration();
		
		const strStart = this.streamStart;
		const worldTime = this.getTimeSecs();
		console.log('getTimeSecs called by updateLiveButton');

		if (this.clientStart == 0){
			this.clientStart = worldTime - strStart;
			console.log('[CustomAudioPlayer] Set clientStart:', this.formatTime(this.clientStart), 'worldTime:', this.formatTime(worldTime), 'streamStart:', this.formatTime(strStart));
		}

		this.clientTime = this.clientStart + this.audioElement.currentTime;
		console.log('[CustomAudioPlayer] clientTime calculation - clientStart:', this.formatTime(this.clientStart), 'worldTime:', this.formatTime(worldTime), 'currentTime:', this.formatTime(this.audioElement.currentTime), 'result:', this.formatTime(this.clientTime));
		const streamTime = worldTime - strStart;
		const timeBehind = streamTime - this.clientTime;
		const behindThreshold = 5; // Enable button if more than 5 seconds behind
		const isBehind = timeBehind > behindThreshold;
		
		// Log for debugging
		console.log('[CustomAudioPlayer] Live check - Current:', this.formatTime(this.clientTime.toFixed(2)), 'Live Edge:', this.formatTime(streamTime.toFixed(2)), 'Behind:', this.formatTime(timeBehind.toFixed(2)), 'Stream Start:', this.formatTime(this.streamStart), 'Paused:', this.audioElement.paused);
		
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
		// Get the current stream duration by calculating with stream start time
		const worldTime = this.getTimeSecs();
		console.log('getTimeSecs called by jumpToLive');
		const streamTime = worldTime - this.streamStart;

		console.log('Stream duration: ', this.formatTime(streamTime));
		
		// Jump to the estimated live edge
		this.audioElement.currentTime = streamTime - 3;
		console.log('[CustomAudioPlayer] Jumped to live position:', this.formatTime(streamTime - 3));
		
		// Resume playback if it was paused
		if (this.audioElement.paused) {
			this.audioElement.play();
		}
	}

	streamDuration() {
		const timeKeeper = () => {
			fetch(this.ICECAST_URL)
				.then(r => r.json())
				.then(data => {
					const timeInSeconds = this.getTimeSecs();
					console.log('getTimeSecs called by streamDuration');

					// Returns the time that the stream started in seconds (EST)
					function liveStartSecs() {
						const dateArr = data.icestats.source.stream_start.split(/\s+/);
						console.log('Stream start date as an array:', dateArr);
						const timeStrip = dateArr[4].split(':');
						console.log('Stream start time as an array:', timeStrip);
						const startInSecs = (parseInt(timeStrip[0]) * (60 * 60)) + (parseInt(timeStrip[1]) * 60) + parseInt(timeStrip[2]);
						console.log('Stream start time in Seconds:', startInSecs);
						return startInSecs;
					}
					const streamStartSecs = liveStartSecs();
					this.streamStart = streamStartSecs;
					//console.log('Local variable:', streamStartSecs, 'Global Variable:', this.streamStart);

					let streamDur = timeInSeconds - streamStartSecs;
					this.streamDur = streamDur; // Store as property
					//console.log('Stream duration in seconds:', streamDur);

					// Formats time from seconds back into a readable format
					// Mostly usefull for debug so I'll leave out unless I need it
					/* function timeFormat(timeToForm) {
						const seconds = Math.floor(timeToForm % 60).toString().padStart(2, '0');
						const minutes = Math.floor((timeToForm / 60) % 60).toString().padStart(2, '0');
						const wholeMinutes = Math.floor(timeToForm / 60);
						const hours = Math.floor(wholeMinutes / 60).toString().padStart(2, '0');
						return `${hours}:${minutes}:${seconds}`;
					}

					const formattedStream = timeFormat(streamDur);
					console.log('Formatted stream duration:', formattedStream); */
				});
		};
		timeKeeper();
		//return;
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
