// components/timeline/timeline-manager.js
import { StorageManager } from '../../utils/storage.js';

export class TimelineManager extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.records = [];
        this.currentTimelineId = null;
    }

    static get styles() {
        return `
            :host {
                display: block;
                height: 100%;
                overflow-y: auto;
            }

            .timeline {
                position: relative;
                padding: 1rem;
            }

            .timeline-line {
                position: absolute;
                left: 2rem;
                top: 0;
                bottom: 0;
                width: 2px;
                background-color: var(--color-gray-200, #e5e5e5);
            }

            .date-group {
                margin-bottom: 2rem;
                position: relative;
            }

            .date-header {
                margin-bottom: 1rem;
                font-weight: bold;
                color: var(--color-gray-500, #737373);
                position: sticky;
                top: 0;
                background: var(--color-background, #ffffff);
                padding: 0.5rem 0;
                z-index: 1;
            }

            .records-container {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-left: 3rem;
            }
        `;
    }

    connectedCallback() {
        this.render();
        this.addEventListener('record-updated', this.handleRecordUpdate);
    }

    disconnectedCallback() {
        this.removeEventListener('record-updated', this.handleRecordUpdate);
    }

    async loadTimeline(timelineId) {
        this.currentTimelineId = timelineId;
        try {
            const storage = window.app.storage;
            this.records = await storage.getRecords(timelineId);
            console.log('Loaded records:', this.records); // Add this debug line
            this.render();
        } catch (error) {
            console.error('Error loading timeline records:', error);
            throw error;
        }
    }

    groupRecordsByDate(records) {
        return records.reduce((groups, record) => {
            const date = new Date(record.createdAt).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(record);
            return groups;
        }, {});
    }

    handleRecordUpdate = async (event) => {
        const { record, action } = event.detail;
        const storage = window.app.storage;
        
        if (action === 'delete') {
            await storage.deleteRecord(this.currentTimelineId, record.id);
            this.records = this.records.filter(r => r.id !== record.id);
        } else if (action === 'update') {
            await storage.updateRecord(this.currentTimelineId, record.id, record);
            const index = this.records.findIndex(r => r.id === record.id);
            if (index !== -1) {
                this.records[index] = record;
            }
        }
        
        this.render();
    }

    render() {
        const style = document.createElement('style');
        style.textContent = TimelineManager.styles;

        const timeline = document.createElement('div');
        timeline.className = 'timeline';

        const timelineLine = document.createElement('div');
        timelineLine.className = 'timeline-line';
        timeline.appendChild(timelineLine);

        if (this.records.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '2rem';
            emptyMessage.style.color = 'var(--color-gray-500, #737373)';
            emptyMessage.textContent = 'No records yet. Create your first record!';
            timeline.appendChild(emptyMessage);
        } else {
            const groupedRecords = this.groupRecordsByDate(this.records);
            
            Object.entries(groupedRecords)
                .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA))
                .forEach(([date, records]) => {
                    const dateGroup = document.createElement('div');
                    dateGroup.className = 'date-group';

                    const dateHeader = document.createElement('div');
                    dateHeader.className = 'date-header';
                    dateHeader.textContent = date;
                    dateGroup.appendChild(dateHeader);

                    const recordsContainer = document.createElement('div');
                    recordsContainer.className = 'records-container';

                    records.forEach(record => {
                        const recordElement = document.createElement('timeline-record');
                        recordElement.record = record;
                        recordElement.timelineId = this.currentTimelineId;
                        recordsContainer.appendChild(recordElement);
                    });

                    dateGroup.appendChild(recordsContainer);
                    timeline.appendChild(dateGroup);
                });
        }

        this.shadowRoot.replaceChildren(style, timeline);
    }
}

customElements.define('timeline-manager', TimelineManager);
