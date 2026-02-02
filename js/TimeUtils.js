class TimeUtilities {
    constructor() {
        //icecast json variables
		this.ICECAST_URL = 'http://dev.motormeme.com:8000/status-json.xsl';
        this.streamStartSecs = 0;
    }

    //------Add in second formatting for front facing with 0:00:00 format not 00:00:00
    //Broadcast time is given in seconds
    //Returns time formatted in Hours:Minutes:Seconds
    //If time is static and appears as 00:00:00, it is most likely NaN
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00:00';
        const temp = Math.floor(seconds / 60);
        const hours = Math.floor(temp / 60);
        const mins = Math.floor(temp % 60);
        const secs = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Returns EST time converted to seconds
	// Server runs on EST time so this is useful for a number of things
	getTimeSecs() {
		try {
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
			
			console.log('Parsed EST - Hours:', hours, 'Minutes:', minutes, 'Seconds:', seconds);
			
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

    //streamDuration() {
    async getStreamStart() {
		const response = await fetch(this.ICECAST_URL);
		const data = await response.json();
		// Returns the time that the stream started in seconds (EST)
        const dateArr = data.icestats.source.stream_start.split(/\s+/);
        console.log('Stream start date as an array:', dateArr);
        const timeStrip = dateArr[4].split(':');
        console.log('Stream start time as an array:', timeStrip);
        const startInSecs = (parseInt(timeStrip[0]) * (60 * 60)) + (parseInt(timeStrip[1]) * 60) + parseInt(timeStrip[2]);
        console.log('Stream start time in Seconds:', startInSecs);

		this.streamStartSecs = startInSecs
		console.log('Local variable:', this.streamStartSecs);
		return startInSecs;
	}
}
export {TimeUtilities};