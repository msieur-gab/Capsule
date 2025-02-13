// components/editors/shared-editor-utils.js
export class BaseEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get styles() {
        return `
            :host {
                display: block;
                width: 100%;
            }

            .editor-container {
                padding: 1rem;
            }

            .error {
                color: var(--color-error, #dc2626);
                font-size: 0.875rem;
                margin-top: 0.5rem;
            }

            button {
                background: var(--color-gray-100, #f5f5f5);
                border: 1px solid var(--color-gray-300, #d4d4d4);
                border-radius: 4px;
                padding: 0.5rem 1rem;
                cursor: pointer;
            }

            button:hover {
                background: var(--color-gray-200, #e5e5e5);
            }

            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
    }

    dispatchSave(content, type) {
        this.dispatchEvent(new CustomEvent('save-record', {
            bubbles: true,
            composed: true,
            detail: { content, type }
        }));
    }

    dispatchError(message) {
        this.dispatchEvent(new CustomEvent('editor-error', {
            bubbles: true,
            composed: true,
            detail: { message }
        }));
    }

    // Default save method - should be overridden by child classes
    save() {
        throw new Error('Save method must be implemented by child class');
    }

    // Default cleanup method - can be overridden by child classes if needed
    cleanup() {
        // Default cleanup implementation
    }
}
