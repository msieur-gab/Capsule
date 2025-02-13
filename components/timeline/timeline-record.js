// components/timeline/timeline-record.js
import { MediaHandler } from '../../utils/media-handlers.js';

export class TimelineRecord extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.expanded = false;
    }

    set record(value) {
        this._record = value;
        this.render();
    }

    get record() {
        return this._record;
    }

    set timelineId(value) {
        this._timelineId = value;
    }

    static get styles() {
        return `
            :host {
                display: block;
            }

            .record {
                background: var(--color-background, #ffffff);
                border: 1px solid var(--color-gray-200, #e5e5e5);
                border-radius: 8px;
                padding: 1rem;
                position: relative;
                cursor: pointer;
                transition: box-shadow 0.2s ease;
            }

            .record:hover {
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .record-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
            }

            .record-title {
                font-weight: 500;
                flex-grow: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .record-time {
                font-size: 0.875rem;
                color: var(--color-gray-500, #737373);
                white-space: nowrap;
            }

            .record-metadata {
                display: flex;
                gap: 0.5rem;
                font-size: 0.75rem;
                color: var(--color-gray-400, #a3a3a3);
                align-items: center;
            }

            .record-size, .record-duration {
                white-space: nowrap;
            }

            .record-content {
                margin-top: 1rem;
                overflow: hidden;
                max-height: 0;
                opacity: 0;
                transition: max-height 0.3s ease-out, opacity 0.3s ease-out, margin-top 0.3s ease-out;
            }

            .record.expanded .record-content {
                max-height: 2000px;
                opacity: 1;
                margin-top: 1rem;
            }

            .expand-icon {
            font-size:1.2em;
                transition: transform 0.3s ease;
                margin-right: 0.5rem;
            }

            .record.expanded .expand-icon {
                transform: rotate(45deg);
            }

            .controls {
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
                margin-top: 1rem;
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .record.expanded .controls {
                opacity: 1;
            }

            button {
                background: transparent;
                border: none;
                padding: 0.25rem;
                cursor: pointer;
                color: var(--color-gray-500, #737373);
            }

            button:hover {
                color: var(--color-text, #1a1a1a);
            }

            /* Media specific styles */
            .text-content {
                white-space: pre-wrap;
            }

            .audio-content audio {
                width: 100%;
            }

            .image-content img {
                max-width: 100%;
                border-radius: 4px;
            }

            .text-content h1 {
                font-size: 1.5em;
                margin: 0.25em 0;
            }

            .text-content h2 {
                font-size: 1.3em;
                margin: 0.25em 0;
            }

            .text-content h3 {
                font-size: 1.1em;
                margin: 0.05em 0;
            }

            .text-content h4 {
                font-size: 1em;
                margin: 0.05em 0;
            }

            .text-content code {
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                background-color: var(--color-gray-100);
                padding: 0.2rem 0.4rem;
                border-radius: 4px;
                font-size: 0.8em;
                display: block;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
        `;
    }

    extractTitle() {
        if (this.record.type === 'text') {
            // Try to find first heading or first line
            const content = this.record.content;
            const headingMatch = content.match(/^#+ (.+)$/m);
            if (headingMatch) return headingMatch[1];
            
            // Get first line, limited to 50 characters
            const firstLine = content.split('\n')[0];
            return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
        }
        return `${this.record.type.charAt(0).toUpperCase() + this.record.type.slice(1)} note`;
    }

    toggleExpanded() {
        this.expanded = !this.expanded;
        const record = this.shadowRoot.querySelector('.record');
        if (this.expanded) {
            record.classList.add('expanded');
        } else {
            record.classList.remove('expanded');
        }
    }

    calculateSize(content, type) {
        switch (type) {
            case 'text':
                return new Blob([content]).size;
            case 'audio':
            case 'image':
                const base64Length = content.length - (content.indexOf(',') + 1);
                return Math.floor((base64Length * 3) / 4);
        }
        return 0;
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    estimateAudioDuration(sizeInBytes) {
        const bitsPerSecond = 64000;
        const bytesPerSecond = bitsPerSecond / 8;
        const containerOverhead = 0.01;
        const adjustedSize = sizeInBytes * (1 - containerOverhead);
        const durationSeconds = adjustedSize / bytesPerSecond;
        return Math.round(durationSeconds);
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showImageFullscreen(src) {
        const dialog = document.createElement('dialog');
        dialog.innerHTML = `
            <img src="${src}" alt="Fullscreen image" style="max-width: 90vw; max-height: 90vh;">
            <button onclick="this.closest('dialog').close()">Close</button>
        `;
        document.body.appendChild(dialog);
        dialog.showModal();
        dialog.addEventListener('close', () => dialog.remove());
    }

    async renderContent() {
        const { type, content } = this.record;
        const contentDiv = document.createElement('div');
        contentDiv.className = `${type}-content record-content`;

        switch (type) {
            case 'text':
                contentDiv.innerHTML = MediaHandler.formatMarkdown(content);
                break;

            case 'audio':
                try {
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    const blob = await MediaHandler.base64ToBlob(content);
                    const url = URL.createObjectURL(blob);
                    audio.src = url;
                    
                    contentDiv.addEventListener('disconnected', () => {
                        URL.revokeObjectURL(url);
                    });

                    contentDiv.appendChild(audio);
                } catch (error) {
                    console.error('Error rendering audio:', error);
                    contentDiv.textContent = 'Error loading audio';
                }
                break;

            case 'image':
                const img = document.createElement('img');
                img.src = content;
                img.alt = 'Record image';
                img.addEventListener('click', () => this.showImageFullscreen(content));
                contentDiv.appendChild(img);
                break;
        }

        return contentDiv;
    }

    async render() {
        if (!this.record) return;

        const style = document.createElement('style');
        style.textContent = TimelineRecord.styles;

        const record = document.createElement('div');
        record.className = 'record';

        // Create header
        const header = document.createElement('div');
        header.className = 'record-header';

        // Add expand icon
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.textContent = '+';

        // Add title
        const title = document.createElement('div');
        title.className = 'record-title';
        title.textContent = this.extractTitle();

        const timeAndMeta = document.createElement('div');
        timeAndMeta.className = 'record-metadata';

        const time = document.createElement('div');
        time.className = 'record-time';
        time.textContent = new Date(this.record.createdAt).toLocaleTimeString();

        const contentSize = this.calculateSize(this.record.content, this.record.type);
        const size = document.createElement('div');
        size.className = 'record-size';
        size.textContent = this.formatSize(contentSize);

        timeAndMeta.appendChild(time);

        if (this.record.type === 'audio') {
            const duration = document.createElement('div');
            duration.className = 'record-duration';
            const estimatedDuration = this.estimateAudioDuration(contentSize);
            duration.textContent = this.formatDuration(estimatedDuration);
            timeAndMeta.appendChild(duration);
        }

        timeAndMeta.appendChild(size);

        header.append(expandIcon, title, timeAndMeta);

        // Add content
        const content = await this.renderContent();

        // Add controls
        const controls = document.createElement('div');
        controls.className = 'controls';

        const editButton = document.createElement('button');
        editButton.textContent = '✏️';
        editButton.title = 'Edit';
        editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editRecord();
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '🗑️';
        deleteButton.title = 'Delete';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteRecord();
        });

        controls.append(editButton, deleteButton);

        // Add click handler for expansion
        record.addEventListener('click', () => this.toggleExpanded());

        record.append(header, content, controls);
        this.shadowRoot.replaceChildren(style, record);
    }

    editRecord() {
        this.dispatchEvent(new CustomEvent('edit-record', {
            bubbles: true,
            composed: true,
            detail: { record: this.record, timelineId: this._timelineId }
        }));
    }

    async deleteRecord() {
        if (confirm('Are you sure you want to delete this record?')) {
            this.dispatchEvent(new CustomEvent('record-updated', {
                bubbles: true,
                composed: true,
                detail: {
                    record: this.record,
                    timelineId: this._timelineId,
                    action: 'delete'
                }
            }));
        }
    }
}

customElements.define('timeline-record', TimelineRecord);