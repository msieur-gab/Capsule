// utils/media-handlers.js
import { ImageProcessor } from './image-processor.js';

export class MediaHandler {

    static async compressImage(file) {
        try {
            const result = await ImageProcessor.processImage(file, 800);
            const size = Math.round(result.blob.size / 1024);
            console.log(`Image processed: ${result.format} format (${result.mimeType}), ${result.width}x${result.height}, ${size}KB`);
            
            return {
                blob: result.blob,
                mimeType: result.mimeType,
                width: result.width,
                height: result.height,
                size: size
            };
        } catch (error) {
            console.error('Error processing image:', error);
            throw new Error('Failed to process image: ' + error.message);
        }
    }
    
    static async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);
            };
            reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
            reader.readAsDataURL(blob);
        });
    }
    
    static async base64ToBlob(base64String) {
        try {
            const response = await fetch(base64String);
            const blob = await response.blob();
            console.log(`Converted from base64 to blob of type: ${blob.type}`);
            return blob;
        } catch (error) {
            console.error('Error converting base64 to blob:', error);
            throw new Error('Failed to convert base64 to blob');
        }
    }
   
    
    static async processAudioRecording(blob) {
        // For now, we'll just ensure it's in the right format
        if (blob.type !== 'audio/webm') {
            throw new Error('Unsupported audio format. Please use WebM.');
        }
        
        return blob; // Remove the duration check since it's handled by the MediaRecorder timeout
    }
    
    static formatMarkdown(text) {
        return text
        // Headers - important to process these first before other inline formats
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')  // h3
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')  // h3
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')   // h2
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')    // h1
        // Basic markdown processing
        // This could be expanded based on needs

            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/```(.*?)```/g, '<code>$1</code>');
    }
    
}

// utils/media-handlers.js
export class MediaRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.chunks = [];
    }
        
        async startAudioRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        channelCount: 1, // Mono audio
                        sampleRate: 22050, // Lower sample rate
                        // Chrome-specific constraints
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
    
                // Configure MediaRecorder with 64kbps WebM
                const options = {
                    audioBitsPerSecond: 64000 // 64 kbps
                };
    
                // Check if WebM with Opus is supported
                if (window.MediaRecorder && window.MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    options.mimeType = 'audio/webm;codecs=opus';
                } else {
                    console.warn('WebM Opus not supported, falling back to default WebM');
                    if (window.MediaRecorder && window.MediaRecorder.isTypeSupported('audio/webm')) {
                        options.mimeType = 'audio/webm';
                    } else {
                        console.warn('WebM not supported, using default browser format');
                    }
                }
    
                this.mediaRecorder = new window.MediaRecorder(stream, options);
                this.chunks = [];
                
                this.mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        this.chunks.push(e.data);
                    }
                };
                
                this.mediaRecorder.start();
                
                return new Promise((resolve, reject) => {
                    this.mediaRecorder.onstop = async () => {
                        const blob = new Blob(this.chunks, { type: 'audio/webm' });
                        try {
                            const processedBlob = await MediaHandler.processAudioRecording(blob);
                            resolve(processedBlob);
                        } catch (error) {
                            reject(error);
                        } finally {
                            // Stop all tracks
                            stream.getTracks().forEach(track => track.stop());
                        }
                    };
                    
                    // Set maximum duration to 60 seconds
                    setTimeout(() => {
                        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                            console.log('Stopping recording due to duration limit');
                            this.stopRecording();
                        }
                    }, 60000);
                });
            } catch (error) {
                throw new Error('Error accessing microphone: ' + error.message);
            }
        }
        
        stopRecording() {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
        }
    }