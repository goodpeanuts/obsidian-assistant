import { App, Modal, Notice } from 'obsidian';

export class TextWrapperModal extends Modal {
    private inputTextEl!: HTMLTextAreaElement;
    private outputTextEl!: HTMLTextAreaElement;
    private statusEl!: HTMLDivElement;

    constructor(app: App) {
        super(app);
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Text Wrapper Tool' });

        const controlsEl = contentEl.createDiv({ cls: 'assistant-text-wrapper-controls' });
        controlsEl.style.display = 'flex';
        controlsEl.style.gap = '8px';
        controlsEl.style.marginBottom = '12px';
        controlsEl.style.flexWrap = 'wrap';

        const pasteAndProcessBtn = controlsEl.createEl('button', { text: 'Paste & Process' });
        pasteAndProcessBtn.onclick = async () => {
            await this.loadFromClipboardAndProcess();
        };

        const processInputBtn = controlsEl.createEl('button', { text: 'Process Input' });
        processInputBtn.onclick = async () => {
            await this.processAndCopy();
        };

        const copyOutputBtn = controlsEl.createEl('button', { text: 'Copy Output' });
        copyOutputBtn.onclick = async () => {
            await this.copyOutput();
        };

        const confirmBtn = controlsEl.createEl('button', { text: 'Confirm' });
        confirmBtn.classList.add('mod-cta');
        confirmBtn.onclick = () => {
            this.close();
        };

        const inputGroupEl = contentEl.createDiv({ cls: 'assistant-text-wrapper-group' });
        inputGroupEl.style.marginBottom = '12px';
        inputGroupEl.createEl('label', { text: 'Input' });
        this.inputTextEl = inputGroupEl.createEl('textarea');
        this.inputTextEl.style.width = '100%';
        this.inputTextEl.style.minHeight = '140px';

        const outputGroupEl = contentEl.createDiv({ cls: 'assistant-text-wrapper-group' });
        outputGroupEl.style.marginBottom = '12px';
        outputGroupEl.createEl('label', { text: 'Output' });
        this.outputTextEl = outputGroupEl.createEl('textarea');
        this.outputTextEl.style.width = '100%';
        this.outputTextEl.style.minHeight = '140px';
        this.outputTextEl.readOnly = true;

        this.statusEl = contentEl.createDiv({ cls: 'assistant-text-wrapper-status' });
        this.statusEl.style.minHeight = '20px';
        this.statusEl.style.color = 'var(--text-muted)';

        await this.loadFromClipboardAndProcess();
    }

    onClose() {
        this.contentEl.empty();
    }

    private showStatus(message: string) {
        this.statusEl.setText(message);
    }

    private processText(rawText: string): string {
        if (!rawText) {
            return '';
        }

        return rawText
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => `- [[${line}]]`)
            .join('\n');
    }

    private async loadFromClipboardAndProcess() {
        try {
            const input = await this.readClipboardText();
            this.inputTextEl.value = input;
            await this.processAndCopy();
        } catch (error) {
            console.error('Failed to read clipboard text.', error);
            this.showStatus('Failed to read clipboard. Paste manually and click Process Input.');
            new Notice('Failed to read clipboard.');
        }
    }

    private async processAndCopy() {
        const result = this.processText(this.inputTextEl.value);
        this.outputTextEl.value = result;

        if (!result) {
            this.showStatus('No valid text to process.');
            return;
        }

        try {
            await this.writeClipboardText(result);
            this.showStatus('Processed output copied to clipboard.');
        } catch (error) {
            console.error('Failed to write clipboard text.', error);
            this.showStatus('Failed to copy output automatically.');
            new Notice('Failed to copy output to clipboard.');
        }
    }

    private async copyOutput() {
        const text = this.outputTextEl.value;
        if (!text) {
            this.showStatus('No output to copy.');
            return;
        }

        try {
            await this.writeClipboardText(text);
            this.showStatus('Output copied to clipboard.');
        } catch (error) {
            console.error('Failed to copy output text.', error);
            this.showStatus('Copy failed.');
            new Notice('Failed to copy output to clipboard.');
        }
    }

    private async readClipboardText(): Promise<string> {
        if (navigator.clipboard?.readText) {
            try {
                return await navigator.clipboard.readText();
            } catch (error) {
                console.warn('Navigator clipboard read failed. Falling back to Electron clipboard.', error);
            }
        }

        const clipboard = this.getElectronClipboard();
        if (clipboard) {
            return clipboard.readText();
        }

        throw new Error('Clipboard read is not available.');
    }

    private async writeClipboardText(text: string): Promise<void> {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return;
            } catch (error) {
                console.warn('Navigator clipboard write failed. Falling back to Electron clipboard.', error);
            }
        }

        const clipboard = this.getElectronClipboard();
        if (clipboard) {
            clipboard.writeText(text);
            return;
        }

        throw new Error('Clipboard write is not available.');
    }

    private getElectronClipboard(): { readText: () => string; writeText: (text: string) => void } | null {
        try {
            const electron = (window as any).require?.('electron');
            if (electron?.clipboard) {
                return electron.clipboard;
            }
        } catch (error) {
            console.error('Failed to access electron clipboard.', error);
        }

        return null;
    }
}
