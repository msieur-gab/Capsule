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
                min-height: 0; /* Important for proper flex containment */
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

            .year-group {
                margin-bottom: 2rem;
                position: relative;
            }

            .year-header {
                position: sticky;
                top: 0;
                background: var(--color-background, #ffffff);
                padding: 1rem 0;
                font-size: 1.5rem;
                font-weight: bold;
                color: var(--color-gray-700, #404040);
                z-index: 2;
                border-bottom: 1px solid var(--color-gray-200, #e5e5e5);
            }

            .date-group {
                margin-bottom: 1.5rem;
                position: relative;
            }

            .date-header {
                position: sticky;
                top: 4rem; /* Position below year header */
                background: var(--color-background, #ffffff);
                padding: 0.5rem 0;
                font-weight: 600;
                color: var(--color-gray-, #333);
                z-index: 1;
                font-size: 0.8rem;
            }

            .records-container {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-left: 3rem;
                padding-bottom: 1rem;
            }

            .empty-message {
                text-align: center;
                padding: 2rem;
                color: var(--color-gray-500, #737373);
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
            this.render();
        } catch (error) {
            console.error('Error loading timeline records:', error);
            throw error;
        }
    }

    groupRecordsByYearAndDate(records) {
        return records.reduce((groups, record) => {
            const date = new Date(record.createdAt);
            const year = date.getFullYear();
            const dateStr = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
            });

            if (!groups[year]) {
                groups[year] = {};
            }
            if (!groups[year][dateStr]) {
                groups[year][dateStr] = [];
            }
            groups[year][dateStr].push(record);
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
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = 'No records yet. Create your first record!';
            timeline.appendChild(emptyMessage);
        } else {
            const groupedRecords = this.groupRecordsByYearAndDate(this.records);
            
            // Sort years in descending order
            Object.keys(groupedRecords)
                .sort((a, b) => b - a)
                .forEach(year => {
                    const yearGroup = document.createElement('div');
                    yearGroup.className = 'year-group';

                    const yearHeader = document.createElement('div');
                    yearHeader.className = 'year-header';
                    yearHeader.textContent = year;
                    yearGroup.appendChild(yearHeader);

                    // Sort dates in descending order
                    Object.entries(groupedRecords[year])
                        .sort(([dateA], [dateB]) => {
                            const a = new Date(dateA + ", " + year);
                            const b = new Date(dateB + ", " + year);
                            return b - a;
                        })
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
                            yearGroup.appendChild(dateGroup);
                        });

                    timeline.appendChild(yearGroup);
                });
        }

        this.shadowRoot.replaceChildren(style, timeline);
    }
}

customElements.define('timeline-manager', TimelineManager);