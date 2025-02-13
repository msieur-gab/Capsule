// components/editors/image-editor.js
import { BaseEditor } from './shared-editor-utils.js';
import { MediaHandler } from '../../utils/media-handlers.js';

export class ImageEditor extends BaseEditor {
    constructor() {
        super(); // This will handle shadow DOM creation
        this.imageBlob = null;
    }

    static get styles() {
        return `
            ${BaseEditor.styles}

            .capture-controls {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .preview-container {
                position: relative;
                margin-top: 1rem;
            }

            .preview-container img {
                max-width: 100%;
                border-radius: 4px;
            }

            #cameraFeed {
                width: 100%;
                border-radius: 4px;
            }

            .capture-button {
                background: var(--color-gray-100, #f5f5f5);
                border: none;
                border-radius: 50%;
                width: 48px;
                height: 48px;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .image-info {
                margin-top: 0.5rem;
                font-size: 0.875rem;
                color: var(--color-gray-500);
            }
        `;
    }

    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            const video = this.shadowRoot.querySelector('#cameraFeed');
            video.srcObject = stream;
            video.style.display = 'block';
            this.cameraStream = stream; // Store the stream reference
            return stream;
        } catch (error) {
            console.error('Camera error:', error);
            this.dispatchError('Unable to access camera: ' + error.message);
            return null;
        }
    }

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => {
                track.stop();
            });
            this.cameraStream = null;
            const video = this.shadowRoot.querySelector('#cameraFeed');
            if (video) {
                video.srcObject = null;
                video.style.display = 'none';
            }
            console.log('Camera stopped');
        }
    }

    async captureImage() {
        const video = this.shadowRoot.querySelector('#cameraFeed');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        console.log('Capturing image from camera:', canvas.width, 'x', canvas.height);
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        try {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 1.0));
            console.log('Camera capture blob:', blob.type, Math.round(blob.size / 1024), 'KB');
            
            const processedImage = await MediaHandler.compressImage(blob);
            this.imageBlob = processedImage.blob;
            
            await this.renderImagePreview();
            this.stopCamera(); // Stop the camera after successful capture
        } catch (error) {
            console.error('Error processing camera image:', error);
            this.dispatchError('Failed to process image: ' + error.message);
        }
    }

    async renderImagePreview() {
        if (!this.imageBlob) {
            console.error('No image blob available');
            return;
        }
    
        const container = this.shadowRoot.querySelector('.preview-container');
        
        // Clean up any existing URLs
        const existingImg = container.querySelector('img');
        if (existingImg && existingImg.src) {
            URL.revokeObjectURL(existingImg.src);
        }
        
        container.innerHTML = '';
    
        try {
            const img = document.createElement('img');
            const url = URL.createObjectURL(this.imageBlob);
            img.src = url;
            
            // Clean up the URL when the image is loaded
            img.onload = () => {
                URL.revokeObjectURL(url);
            };
            
            container.appendChild(img);
    
            // Add image info
            const info = document.createElement('div');
            info.className = 'image-info';
            info.textContent = `Format: ${this.imageBlob.type}, Size: ${Math.round(this.imageBlob.size / 1024)}KB`;
            container.appendChild(info);
        } catch (error) {
            console.error('Error rendering preview:', error);
            this.dispatchError('Failed to display image preview');
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                const container = this.shadowRoot.querySelector('.preview-container');
                container.innerHTML = '<div class="processing-indicator">Processing image...</div>';
    
                const processedImage = await MediaHandler.compressImage(file);
                this.imageBlob = processedImage.blob;
                
                // Hide video feed and show preview
                const video = this.shadowRoot.querySelector('#cameraFeed');
                if (video) {
                    video.style.display = 'none';
                }
                
                await this.renderImagePreview();
            } catch (error) {
                console.error('Error handling file:', error);
                this.dispatchError('Failed to process image: ' + error.message);
            }
        }
    }

    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            const video = this.shadowRoot.querySelector('#cameraFeed');
            video.srcObject = stream;
            video.style.display = 'block';
            return stream;
        } catch (error) {
            console.error('Camera error:', error);
            this.dispatchError('Unable to access camera: ' + error.message);
            return null;
        }
    }

    connectedCallback() {
        const style = document.createElement('style');
        style.textContent = ImageEditor.styles;

        const container = document.createElement('div');
        container.className = 'editor-container';

        const controls = document.createElement('div');
        controls.className = 'capture-controls';

        const video = document.createElement('video');
        video.id = 'cameraFeed';
        video.autoplay = true;
        video.playsInline = true;

        const captureButton = document.createElement('button');
        captureButton.className = 'capture-button';
        captureButton.textContent = '📸';
        captureButton.addEventListener('click', () => this.captureImage());

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        const uploadButton = document.createElement('button');
        uploadButton.textContent = 'Upload Image';
        uploadButton.addEventListener('click', () => fileInput.click());

        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-container';

        controls.append(captureButton, uploadButton);
        container.append(controls, video, previewContainer);

        this.shadowRoot.append(style, container);
        this.initializeCamera();

        // Save method for external access
        this.save = async () => {
            if (this.imageBlob) {
                try {
                    const base64 = await MediaHandler.blobToBase64(this.imageBlob);
                    this.stopCamera(); // Ensure camera is stopped when saving
                    this.dispatchSave(base64, 'image');
                    return true;
                } catch (error) {
                    console.error('Error saving image:', error);
                    this.dispatchError('Failed to save image');
                    return false;
                }
            }
            this.dispatchError('Please capture or upload an image first');
            return false;
        };
    }

    disconnectedCallback() {
        // Clean up video stream (from previous version)
        const video = this.shadowRoot.querySelector('#cameraFeed');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    
        // Clean up camera stream (new tracking method)
        this.stopCamera();
        
        // Clean up any object URLs
        const img = this.shadowRoot.querySelector('img');
        if (img && img.src) {
            URL.revokeObjectURL(img.src);
        }
    }

    cleanup() {
        this.stopCamera(); // Add camera cleanup to the cleanup method
        super.cleanup();
    }
}

customElements.define('image-editor', ImageEditor);
