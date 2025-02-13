// components/editors/shared-editor-utils.js
import { BaseEditor } from './shared-editor-utils.js';
// components/editors/text-editor.js
export class TextEditor extends BaseEditor {
    constructor() {
        super();
    }

    static get styles() {
        return `
            ${BaseEditor.styles}

            textarea {
                width: 100%;
                min-height: 200px;
                padding: 0.5rem;
                border: 1px solid var(--color-gray-300, #d4d4d4);
                border-radius: 4px;
                font-family: inherit;
                resize: vertical;
            }

            .markdown-tips {
                font-size: 0.875rem;
                color: var(--color-gray-500, #737373);
                margin-top: 0.5rem;
            }
        `;
    }

    connectedCallback() {
        const style = document.createElement('style');
        style.textContent = TextEditor.styles;
    
        const container = document.createElement('div');
        container.className = 'editor-container';
    
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Enter your note here...\nSupports markdown formatting';
        
        if (this.getAttribute('content')) {
            textarea.value = this.getAttribute('content');
        }
    
        const tips = document.createElement('div');
        tips.className = 'markdown-tips';
        tips.textContent = 'Supports basic markdown: **bold**, *italic*, ```code```';
    
        container.appendChild(textarea);
        container.appendChild(tips);
    
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(container);
    
        // Save method for external access
        this.save = () => {
            console.log('TextEditor save called');
            const content = textarea.value.trim();
            if (content) {
                console.log('Dispatching save event with content:', content);
                this.dispatchSave(content, 'text');
                return true;
            }
            console.log('No content to save');
            this.dispatchError('Please enter some text');
            return false;
        };
    }
}
customElements.define('text-editor', TextEditor);
