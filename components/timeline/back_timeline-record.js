// components/timeline/timeline-record.js
import { MediaHandler } from '../../utils/media-handlers.js';

export class TimelineRecord extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
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
            }

            .record:hover {
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

             .record-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }

            .record-time {
                font-size: 0.875rem;
                color: var(--color-gray-500, #737373);
                margin-bottom: 0.5rem;
            }

            .record-size {
                font-size: 0.75rem;
                color: var(--color-gray-400, #a3a3a3);
            }

            .record-content {
                margin-bottom: 1rem;
            }

            .controls {
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
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
        `;
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

    calculateSize(content, type) {
        switch (type) {
            case 'text':
                return new Blob([content]).size;
            case 'audio':
            case 'image':
                // For base64 data, we need to decode first to get actual size
                const base64Length = content.length - (content.indexOf(',') + 1);
                return Math.floor((base64Length * 3) / 4); // Convert base64 length to approximate byte size
        }
        return 0;
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
                const audio = document.createElement('audio');
                audio.controls = true;
                const blob = await MediaHandler.base64ToBlob(content);
                audio.src = URL.createObjectURL(blob);
                contentDiv.appendChild(audio);
                break;

            case 'image':
                const img = document.createElement('img');
                img.src = content; // Already base64
                img.alt = 'Record image';
                img.addEventListener('click', () => this.showImageFullscreen(content));
                contentDiv.appendChild(img);
                break;
        }

        return contentDiv;
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

    async render() {
        if (!this.record) return;

        const style = document.createElement('style');
        style.textContent = TimelineRecord.styles;

        const record = document.createElement('div');
        record.className = 'record';

        // Create header with time and size
        const header = document.createElement('div');
        header.className = 'record-header';

        const time = document.createElement('div');
        time.className = 'record-time';
        time.textContent = new Date(this.record.createdAt).toLocaleTimeString();

        const size = document.createElement('div');
        size.className = 'record-size';
        const contentSize = this.calculateSize(this.record.content, this.record.type);
        size.textContent = this.formatSize(contentSize);

        header.append(time, size);

        const content = await this.renderContent();

        const controls = document.createElement('div');
        controls.className = 'controls';

        const editButton = document.createElement('button');
        editButton.textContent = '✏️';
        editButton.title = 'Edit';
        editButton.addEventListener('click', () => this.editRecord());

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '🗑️';
        deleteButton.title = 'Delete';
        deleteButton.addEventListener('click', () => this.deleteRecord());

        controls.append(editButton, deleteButton);
        record.append(header, content, controls);

        this.shadowRoot.replaceChildren(style, record);
    }


    editRecord() {
        // Dispatch event to be handled by the editor dialog
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
