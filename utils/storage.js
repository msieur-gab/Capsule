// utils/storage.js
// import localforage from 'localforage';

export class StorageManager {
    constructor() {
        // Initialize main store for timeline metadata
        this.timelineStore = localforage.createInstance({
            name: 'timelineNotes',
            storeName: 'timelines'
        });
        
        this.timelineStores = new Map();
    }

    
    async createTimeline(name) {
        const timelineId = `timeline_${Date.now()}`;
        const timeline = {
            id: timelineId,
            name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save timeline metadata
        await this.timelineStore.setItem(timelineId, timeline);
        
        // Create store for timeline content
        const timelineInstance = localforage.createInstance({
            name: 'timelineNotes',
            storeName: timelineId
        });
        
        this.timelineStores.set(timelineId, timelineInstance);
        return timeline;
    }
    
    async getTimelines() {
        const timelines = [];
        await this.timelineStore.iterate((value) => {
            timelines.push(value);
        });
        return timelines.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    
    async getTimelineStore(timelineId) {
        if (!this.timelineStores.has(timelineId)) {
            const timelineInstance = localforage.createInstance({
                name: 'timelineNotes',
                storeName: timelineId
            });
            this.timelineStores.set(timelineId, timelineInstance);
        }
        return this.timelineStores.get(timelineId);
    }
    
    async addRecord(timelineId, record) {
        console.log('Adding record to timeline:', timelineId);
        console.log('Record data:', record);
        
        const store = await this.getTimelineStore(timelineId);
        console.log('Got timeline store:', store);
        
        const recordId = `record_${Date.now()}`;
        const newRecord = {
            id: recordId,
            ...record,
            createdAt: new Date().toISOString()
        };
        
        console.log('Saving new record:', newRecord);
        
        try {
            await store.setItem(recordId, newRecord);
            console.log('Record saved successfully');
            
            // Update timeline metadata
            const timeline = await this.timelineStore.getItem(timelineId);
            console.log('Current timeline:', timeline);
            
            timeline.updatedAt = new Date().toISOString();
            await this.timelineStore.setItem(timelineId, timeline);
            console.log('Timeline updated');
            
            return newRecord;
        } catch (error) {
            console.error('Error saving record:', error);
            throw error;
        }
    }
    
    async getRecords(timelineId) {
        console.log('Getting records for timeline:', timelineId);
        const store = await this.getTimelineStore(timelineId);
        console.log('Got store for timeline');
        
        const records = [];
        try {
            await store.iterate((value, key) => {
                console.log('Found record:', key, value);
                records.push(value);
            });
            
            console.log('All records retrieved:', records);
            return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } catch (error) {
            console.error('Error getting records:', error);
            throw error;
        }
    }

    async updateRecord(timelineId, recordId, updates) {
        const store = await this.getTimelineStore(timelineId);
        const record = await store.getItem(recordId);
        
        if (!record) {
            throw new Error('Record not found');
        }
        
        const updatedRecord = {
            ...record,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        await store.setItem(recordId, updatedRecord);
        
        // Update timeline metadata
        const timeline = await this.timelineStore.getItem(timelineId);
        timeline.updatedAt = new Date().toISOString();
        await this.timelineStore.setItem(timelineId, timeline);
        
        return updatedRecord;
    }
    
    async deleteRecord(timelineId, recordId) {
        const store = await this.getTimelineStore(timelineId);
        await store.removeItem(recordId);
        
        // Update timeline metadata
        const timeline = await this.timelineStore.getItem(timelineId);
        timeline.updatedAt = new Date().toISOString();
        await this.timelineStore.setItem(timelineId, timeline);
    }
    
    async deleteTimeline(timelineId) {
        // Remove timeline metadata
        await this.timelineStore.removeItem(timelineId);
        
        // Remove timeline store
        const store = await this.getTimelineStore(timelineId);
        await store.dropInstance();
        
        this.timelineStores.delete(timelineId);
    }
    
    async exportTimeline(timelineId) {
        const timeline = await this.timelineStore.getItem(timelineId);
        const records = await this.getRecords(timelineId);
        
        return {
            metadata: timeline,
            records: records,
            exportedAt: new Date().toISOString()
        };
    }
    
    async importTimeline(timelineData) {
        // Create new timeline with imported metadata
        const newTimelineId = `timeline_${Date.now()}`;
        const timeline = {
            ...timelineData.metadata,
            id: newTimelineId,
            importedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save timeline metadata
        await this.timelineStore.setItem(newTimelineId, timeline);
        
        // Create store for timeline content
        const store = await this.getTimelineStore(newTimelineId);
        
        // Import records
        for (const record of timelineData.records) {
            const newRecordId = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await store.setItem(newRecordId, {
                ...record,
                id: newRecordId
            });
        }
        
        return timeline;
    }

    // Media handling utilities
    async _storeMedia(timelineId, recordId, blob, mediaType) {
        // Store media data separately to optimize performance
        const mediaStore = await this.getTimelineStore(`${timelineId}_media`);
        await mediaStore.setItem(recordId, {
            type: mediaType,
            data: blob
        });
    }

    async _getMedia(timelineId, recordId) {
        const mediaStore = await this.getTimelineStore(`${timelineId}_media`);
        return await mediaStore.getItem(recordId);
    }

    async _removeMedia(timelineId, recordId) {
        const mediaStore = await this.getTimelineStore(`${timelineId}_media`);
        await mediaStore.removeItem(recordId);
    }
}
