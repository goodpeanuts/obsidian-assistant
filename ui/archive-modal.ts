import { App, Modal, Setting, TFile, Notice } from 'obsidian';
import { Scanner } from '../core/scanner';
import { TimeResolver } from '../core/time-resolver';
import { ArchivePlanner, ArchiveExecutor } from '../core/archiver';
import { ArchiveSettings } from '../settings';

interface ArchiveCandidate {
    file: TFile;
    targetPath: string;
    selected: boolean;
}

export class ArchiveModal extends Modal {
    candidates: ArchiveCandidate[] = [];

    constructor(
        app: App,
        private settings: ArchiveSettings,
        private scanner: Scanner,
        private timeResolver: TimeResolver,
        private planner: ArchivePlanner,
        private executor: ArchiveExecutor
    ) {
        super(app);
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Scanning...' });

        const files = this.scanner.getFilesToArchive();
        this.candidates = [];

        for (const file of files) {
            const destination = this.planner.getDestinationPath(file);
            if (destination) {
                this.candidates.push({
                    file,
                    targetPath: destination,
                    selected: true // Default select all
                });
            }
        }

        this.display();
    }

    display() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Archive Notes' });

        // Control bar
        const controls = contentEl.createDiv({ cls: 'archive-controls' });

        // Add minimal styling for controls if needed, but standard buttons work.

        new Setting(controls)
            .addButton(btn => btn
                .setButtonText('Select All')
                .onClick(() => {
                    this.candidates.forEach(c => c.selected = true);
                    this.display();
                }))
            .addButton(btn => btn
                .setButtonText('Deselect All')
                .onClick(() => {
                    this.candidates.forEach(c => c.selected = false);
                    this.display();
                }));

        // List
        const listContainer = contentEl.createDiv({ cls: 'archive-list' });
        listContainer.style.maxHeight = '400px';
        listContainer.style.overflowY = 'auto';

        if (this.candidates.length === 0) {
            listContainer.createEl('p', { text: 'No files found to archive.' });
        } else {
            this.candidates.forEach(candidate => {
                const item = listContainer.createDiv({ cls: 'archive-item' });
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.marginBottom = '5px';

                // Checkbox
                const cb = item.createEl('input', { type: 'checkbox' });
                cb.checked = candidate.selected;
                cb.onclick = () => {
                    candidate.selected = cb.checked;
                };

                // Text info
                const info = item.createDiv({ cls: 'archive-info' });
                info.style.marginLeft = '10px';
                info.createDiv({ text: candidate.file.basename, cls: 'archive-filename' }).style.fontWeight = 'bold';
                info.createDiv({ text: `→ ${candidate.targetPath}`, cls: 'archive-target' }).style.fontSize = '0.8em';
            });
        }

        // Footer Actions
        const footer = contentEl.createDiv({ cls: 'archive-footer' });
        footer.style.marginTop = '20px';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';

        new Setting(footer)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText(`Archive Selected (${this.candidates.filter(c => c.selected).length})`)
                .setCta()
                .onClick(async () => {
                    await this.executeArchive();
                }));
    }

    async executeArchive() {
        const selected = this.candidates.filter(c => c.selected);
        if (selected.length === 0) {
            new Notice('No files selected.');
            return;
        }

        this.close();
        new Notice(`Archiving ${selected.length} files...`);

        let successCount = 0;
        for (const candidate of selected) {
            try {
                await this.executor.moveFile(candidate.file, candidate.targetPath);
                successCount++;
            } catch (e) {
                console.error(`Failed to archive ${candidate.file.path}`, e);
                new Notice(`Failed: ${candidate.file.basename}`);
            }
        }

        new Notice(`Successfully archived ${successCount} files.`);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
