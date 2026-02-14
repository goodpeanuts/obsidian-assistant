import { App, Modal, Setting, TFile, Notice } from 'obsidian';
import { Scanner } from '../core/scanner';
import { TimeResolver } from '../core/time-resolver';
import { ArchivePlanner, ArchiveExecutor } from '../core/archiver';
import { ArchiveSettings } from '../settings';

interface ArchiveCandidate {
    file: TFile;
    targetPath: string | null;
    selected: boolean;
    selectable: boolean;
    invalidReason?: string;
}

export class ArchiveModal extends Modal {
    candidates: ArchiveCandidate[] = [];

    constructor(
        app: App,
        private settings: ArchiveSettings,
        private scanner: Scanner,
        private timeResolver: TimeResolver,
        private planner: ArchivePlanner,
        private executor: ArchiveExecutor,
        private persistSettings: () => Promise<void>
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
            const createdTime = this.timeResolver.resolveCreatedTimeWithError(file);
            const destination = this.planner.getDestinationPath(file);

            if (destination) {
                const autoSelected = createdTime.date ? this.shouldAutoSelect(createdTime.date) : false;
                this.candidates.push({
                    file,
                    targetPath: destination,
                    selected: autoSelected,
                    selectable: true
                });
            } else {
                this.candidates.push({
                    file,
                    targetPath: null,
                    selected: false,
                    selectable: false,
                    invalidReason: createdTime.error ?? 'Invalid createdTime'
                });
            }
        }

        this.display();
    }

    private shouldAutoSelect(createdTime: Date): boolean {
        const thresholdDays = Math.max(0, this.settings.autoSelectOlderThanDays ?? 0);
        const ageMs = Date.now() - createdTime.getTime();
        const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
        return ageMs >= thresholdMs;
    }

    display() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Archive Notes' });

        const controls = contentEl.createDiv({ cls: 'archive-controls' });

        new Setting(controls)
            .addButton(btn => btn
                .setButtonText('Select All')
                .onClick(() => {
                    this.candidates.forEach(c => c.selected = c.selectable);
                    this.display();
                }))
            .addButton(btn => btn
                .setButtonText('Deselect All')
                .onClick(() => {
                    this.candidates.forEach(c => c.selected = false);
                    this.display();
                }));

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

                const cb = item.createEl('input', { type: 'checkbox' });
                cb.checked = candidate.selected;
                cb.disabled = !candidate.selectable;
                cb.onclick = () => {
                    candidate.selected = cb.checked;
                };

                const info = item.createDiv({ cls: 'archive-info' });
                info.style.marginLeft = '10px';
                info.createDiv({ text: candidate.file.basename, cls: 'archive-filename' }).style.fontWeight = 'bold';

                if (candidate.targetPath) {
                    info.createDiv({ text: `-> ${candidate.targetPath}`, cls: 'archive-target' }).style.fontSize = '0.8em';
                } else {
                    const reasonEl = info.createDiv({ text: `Cannot archive: ${candidate.invalidReason ?? 'Invalid createdTime'}`, cls: 'archive-target' });
                    reasonEl.style.fontSize = '0.8em';
                    reasonEl.style.color = 'var(--text-muted)';
                }

                const ignoreBtn = item.createEl('button', { text: 'Ignore' });
                ignoreBtn.style.marginLeft = 'auto';
                ignoreBtn.onclick = async () => {
                    await this.addFileToIgnoreList(candidate.file);
                };
            });
        }

        const footer = contentEl.createDiv({ cls: 'archive-footer' });
        footer.style.marginTop = '20px';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'flex-end';

        new Setting(footer)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('Archive Selected')
                .setCta()
                .onClick(async () => {
                    await this.executeArchive();
                }));
    }

    async executeArchive() {
        const selected = this.candidates.filter((c): c is ArchiveCandidate & { targetPath: string } => c.selected && c.selectable && !!c.targetPath);
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

    private async addFileToIgnoreList(file: TFile) {
        if (!this.settings.ignoredFilePaths.includes(file.path)) {
            this.settings.ignoredFilePaths.push(file.path);
            await this.persistSettings();
        }
        this.candidates = this.candidates.filter(candidate => candidate.file.path !== file.path);
        this.display();
        new Notice(`Ignored: ${file.path}`);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
