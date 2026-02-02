export function render() {
    this.shadowRoot.innerHTML = `
        
    <style>
            :host {
                --primary-color: #8dbbff;
                --background-color: none;
                --text-color: #FFFFFF;
                --control-size: 40px;
                --content-color: #8dbbff;
            }

            .player-container {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                background: var(--background-color);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: var(--text-color);
                width: 100%;
                max-width: 500px;
                box-sizing: border-box;
            }
 
            .icecast-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 15px 15px;
                border-radius: 50%;
                font-size: 11px;
                font-weight: bold;
                letter-spacing: 0.5px;
                white-space: nowrap;
                transition: background-color 0.3s ease, color 0.3s ease;
            }

            .icecast-badge.live {
                cursor: pointer;
                background: rgba(107, 114, 128, 0.2);;
                color: #c52222;
            }

            .icecast-badge.offline {
                cursor: default;
                background: none;
                color: #6B7280;
            }

            .icecast-badge.caught-up {
                cursor: default;
                background: none;
                color: #c52222;
            }

            .icecast-badge.caught-up .icecast-dot {
                background: #c52222;
                animation: pulse 1.5s ease-in-out infinite;
            }

            .icecast-dot {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: inline-block;
            }

            .icecast-badge.live .icecast-dot {
                background: #c52222;
                animation: pulse 1.5s ease-in-out infinite;
            }

            .icecast-badge.offline .icecast-dot {
                background: #6B7280;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }

            .play-pause-btn {
                flex-shrink: 0;
                width: var(--control-size);
                height: var(--control-size);
                border: none;
                background: transparent;
                color: var(--primary-color);
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                position: relative;
                left: 3%;
                justify-content: center;
                font-size: 25px;
                transition: all 0.2s ease;
            }

            .play-pause-btn:hover {
                background: none;
                color: var(--background-color);
            }

            .progress-section {
                width: 300px;
                flex: 1;
                display: flex;
                gap: 10px;
            }

            .progress-bar {
                width: 100%;
                height: 6px;
                background: var(--content-color);
                border-radius: 3px;
                cursor: pointer;
                position: relative;
                top: 9px;
                overflow: hidden;
            }

            .progress-fill {
                height: 25%;
                background: var(--primary-color);
                width: 0%;
                transition: width 0.1s linear;
            }

            .progress-bar:hover .progress-fill::after {
                content: '';
                position: absolute;
                right: 0;
                top: -4px;
                width: 14px;
                height: 14px;
                background: var(--primary-color);
                border-radius: 50%;
                transform: translateX(50%);
            }

            .time-display {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #888;
            }

            .duration-time{
                white-space: nowrap;
            }

            audio {
                display: none;
            }
        </style>

        <div class="player-container">
            <div class="icecast-status-badge" data-mountpoint="/lomuneo">
                <div class="icecast-badge offline"><span class="icecast-dot"></span></div>
            </div>

            <button class="play-pause-btn" aria-label="Play/Pause">
                <span class="play-icon">▶</span>
            </button>
            
            <div class="progress-section">
                <span class="current-time">0:00:00</span>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <span class="duration-time">0:00:00</span>
            </div>
        </div>

        <audio crossorigin="anonymous" preload="auto">
        </audio>
    `;
}