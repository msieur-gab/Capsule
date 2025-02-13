// components/editors/audio-editor.js
import { BaseEditor } from './shared-editor-utils.js';
import { MediaHandler, MediaRecorder } from '../../utils/media-handlers.js';

export class AudioEditor extends BaseEditor {
    constructor() {
        super();
        this.mediaRecorder = new MediaRecorder();
        this.audioBlob = null;
    }

    static get styles() {
        return `
            ${BaseEditor.styles}

            .recording-controls {
                display: flex;
                gap: 1rem;
                align-items: center;
                margin-bottom: 1rem;
            }

            .record-button {
                background: var(--color-error, #dc2626);
                color: white;
                border: none;
                border-radius: 50%;
                width: 48px;
                height: 48px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .record-button[data-recording="true"] {
                animation: pulse 1.5s infinite;
            }

            .timer {
                font-family: monospace;
                font-size: 1.25rem;
            }

            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }

            audio {
                width: 100%;
                margin-top: 1rem;
            }
        `;
    }

    async startRecording() {
        try {
            const recordButton = this.shadowRoot.querySelector('.record-button');
            recordButton.setAttribute('data-recording', 'true');
            recordButton.textContent = '⏹️';
            
            this.startTimer();
            
            try {
                this.audioBlob = await this.mediaRecorder.startAudioRecording();
                this.renderAudioPreview();
            } catch (error) {
                // Handle any recording errors
                this.dispatchError('Recording error: ' + error.message);
                console.error('Recording error:', error);
            } finally {
                // Always reset the button state
                recordButton.removeAttribute('data-recording');
                recordButton.textContent = '🎙️';
                this.stopTimer();
            }
        } catch (error) {
            this.dispatchError('Failed to start recording: ' + error.message);
            console.error('Recording setup error:', error);
        }
    }

    stopRecording() {
        this.mediaRecorder.stopRecording();
        this.stopTimer();
    }

    startTimer() {
        let seconds = 0;
        const timerDisplay = this.shadowRoot.querySelector('.timer');
        this.timer = setInterval(() => {
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerDisplay.textContent = 
                `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timer);
    }

    cleanup() {
        this.stopTimer();
        if (this.mediaRecorder) {
            this.mediaRecorder.stopRecording();
        }
        // Clean up any existing audio elements
        const audioElements = this.shadowRoot.querySelectorAll('audio');
        audioElements.forEach(audio => {
            if (audio.src) {
                URL.revokeObjectURL(audio.src);
            }
        });
    }

    async renderAudioPreview() {
        if (!this.audioBlob) return;
    
        const container = this.shadowRoot.querySelector('.preview-container');
        // Clean up any existing audio elements
        const existingAudio = container.querySelector('audio');
        if (existingAudio && existingAudio.src) {
            URL.revokeObjectURL(existingAudio.src);
        }
        container.innerHTML = '';
    
        const audio = document.createElement('audio');
        audio.controls = true;
        const audioUrl = URL.createObjectURL(this.audioBlob);
        audio.src = audioUrl;
        container.appendChild(audio);
        
        // Add an event listener to clean up the URL when the audio is removed
        audio.addEventListener('remove', () => {
            URL.revokeObjectURL(audioUrl);
        });
    }

    connectedCallback() {
        const style = document.createElement('style');
        style.textContent = AudioEditor.styles;

        const container = document.createElement('div');
        container.className = 'editor-container';

        const controls = document.createElement('div');
        controls.className = 'recording-controls';

        const recordButton = document.createElement('button');
        recordButton.className = 'record-button';
        recordButton.textContent = '🎙️';
        recordButton.addEventListener('click', () => {
            if (recordButton.getAttribute('data-recording')) {
                this.stopRecording();
            } else {
                this.startRecording();
            }
        });

        const timer = document.createElement('div');
        timer.className = 'timer';
        timer.textContent = '00:00';

        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';

        controls.append(recordButton, timer);
        container.append(controls, previewContainer);

        this.shadowRoot.append(style, container);

        // Save method for external access
        this.save = async () => {
            if (this.audioBlob) {
                const base64 = await MediaHandler.blobToBase64(this.audioBlob);
                this.dispatchSave(base64, 'audio');
                return true;
            }
            this.dispatchError('Please record some audio first');
            return false;
        };
    }

    disconnectedCallback() {
        this.stopTimer();
        if (this.mediaRecorder) {
            this.mediaRecorder.stopRecording();
        }
    }
}

// Register custom element
customElements.define('audio-editor', AudioEditor);
