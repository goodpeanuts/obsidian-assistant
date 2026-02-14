import { App, normalizePath, Notice, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import AssistantPlugin from './main';

export interface SourceFolderConfig {
    path: string;
    includeSubfolders: boolean;
}

export interface ArchiveSettings {
    sourceFolders: SourceFolderConfig[];
    targetRoot: string;
    ignoredFilePaths: string[];
    frontmatterKey: string;
    autoSelectOlderThanDays: number;
    conflictStrategy: "rename" | "skip";
}

export const DEFAULT_SETTINGS: ArchiveSettings = {
    sourceFolders: [{ path: "Inbox", includeSubfolders: false }],
    targetRoot: "Archive",
    ignoredFilePaths: [],
    frontmatterKey: "createdTime",
    autoSelectOlderThanDays: 0,
    conflictStrategy: "rename"
}

export class AssistantSettingTab extends PluginSettingTab {
    plugin: AssistantPlugin;

    constructor(app: App, plugin: AssistantPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Obsidian Assistant Settings' });

        const folderPaths = this.getFolderPaths();
        const markdownPaths = this.getMarkdownPaths();
        const sourceInputState = { value: '' };
        const targetInputState = { value: this.plugin.settings.targetRoot };
        const ignoreInputState = { value: '' };

        const sourceSection = containerEl.createDiv();
        sourceSection.createEl('h3', { text: 'Source Folders' });
        sourceSection.createEl('p', { text: 'Add source folders to scan. Input supports folder path autocomplete.' });

        for (const folderConfig of this.plugin.settings.sourceFolders) {
            new Setting(sourceSection)
                .setName(folderConfig.path)
                .setDesc(folderConfig.includeSubfolders ? '✓ Include subfolders' : '✗ Current folder only')
                .addToggle(toggle => toggle
                    .setValue(folderConfig.includeSubfolders)
                    .setTooltip('Include subfolders')
                    .onChange(async (value) => {
                        folderConfig.includeSubfolders = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }))
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Remove source folder')
                    .onClick(async () => {
                        this.plugin.settings.sourceFolders = this.plugin.settings.sourceFolders.filter(f => f.path !== folderConfig.path);
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        }

        new Setting(sourceSection)
            .setName('Add Source Folder')
            .setDesc('Type a folder path, then click + to confirm.')
            .addText(text => {
                this.attachFolderAutocomplete(text.inputEl, folderPaths, 'source-folders-list');
                text.setPlaceholder('Inbox')
                    .setValue(sourceInputState.value)
                    .onChange((value) => {
                        sourceInputState.value = value;
                    });
                text.inputEl.onkeydown = async (evt: KeyboardEvent) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        await this.tryAddSourceFolder(sourceInputState.value);
                        sourceInputState.value = '';
                        this.display();
                    }
                };
                return text;
            })
            .addButton(btn => btn
                .setButtonText('+')
                .setTooltip('Confirm and add source folder')
                .onClick(async () => {
                    await this.tryAddSourceFolder(sourceInputState.value);
                    sourceInputState.value = '';
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Target Root')
            .setDesc('Single archive root folder. Type path and click + to confirm.')
            .addText(text => {
                this.attachFolderAutocomplete(text.inputEl, folderPaths, 'target-root-list');
                text.setPlaceholder('Archive')
                    .setValue(targetInputState.value)
                    .onChange((value) => {
                        targetInputState.value = value;
                    });
                text.inputEl.onkeydown = async (evt: KeyboardEvent) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        await this.trySetTargetRoot(targetInputState.value);
                        this.display();
                    }
                };
                return text;
            })
            .addButton(btn => btn
                .setButtonText('+')
                .setTooltip('Confirm target root')
                .onClick(async () => {
                    await this.trySetTargetRoot(targetInputState.value);
                    this.display();
                }));

        new Setting(containerEl)
            .setName('Frontmatter Key')
            .setDesc('Key used to read creation date from frontmatter. Default: createdTime')
            .addText(text => text
                .setPlaceholder('createdTime')
                .setValue(this.plugin.settings.frontmatterKey)
                .onChange(async (value) => {
                    this.plugin.settings.frontmatterKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Auto-select older than (days)')
            .setDesc('Only notes with valid createdTime and age >= X days are auto-selected in archive modal.')
            .addText(text => text
                .setPlaceholder('0')
                .setValue(String(this.plugin.settings.autoSelectOlderThanDays))
                .onChange(async (value) => {
                    const parsed = Number.parseInt(value.trim(), 10);
                    this.plugin.settings.autoSelectOlderThanDays =
                        Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                    await this.plugin.saveSettings();
                }));

        const ignoreSection = containerEl.createDiv();
        ignoreSection.createEl('h3', { text: 'Ignored Files' });
        ignoreSection.createEl('p', { text: 'Ignored files will not appear in archive scan results.' });

        for (const filePath of this.plugin.settings.ignoredFilePaths) {
            new Setting(ignoreSection)
                .setName(filePath)
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Remove ignored file')
                    .onClick(async () => {
                        this.plugin.settings.ignoredFilePaths = this.plugin.settings.ignoredFilePaths.filter(path => path !== filePath);
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        }

        new Setting(ignoreSection)
            .setName('Add Ignored File')
            .setDesc('Type markdown file path, then click + to confirm.')
            .addText(text => {
                this.attachPathAutocomplete(text.inputEl, markdownPaths, 'ignored-files-list');
                text.setPlaceholder('Inbox/note.md')
                    .setValue(ignoreInputState.value)
                    .onChange((value) => {
                        ignoreInputState.value = value;
                    });
                text.inputEl.onkeydown = async (evt: KeyboardEvent) => {
                    if (evt.key === 'Enter') {
                        evt.preventDefault();
                        await this.tryAddIgnoredFile(ignoreInputState.value);
                        ignoreInputState.value = '';
                        this.display();
                    }
                };
                return text;
            })
            .addButton(btn => btn
                .setButtonText('+')
                .setTooltip('Confirm and add ignored file')
                .onClick(async () => {
                    await this.tryAddIgnoredFile(ignoreInputState.value);
                    ignoreInputState.value = '';
                    this.display();
                }));

        new Setting(ignoreSection)
            .setName('Edit Ignored List')
            .setDesc('One markdown file path per line.')
            .addTextArea(text => text
                .setPlaceholder('Inbox/note.md')
                .setValue(this.plugin.settings.ignoredFilePaths.join('\n'))
                .onChange(async (value) => {
                    const unique = Array.from(new Set(
                        value
                            .split('\n')
                            .map(line => normalizePath(line.trim()))
                            .filter(Boolean)
                    ));
                    this.plugin.settings.ignoredFilePaths = unique;
                    await this.plugin.saveSettings();
                }));

        // Extended settings can be added here (Conflict Strategy etc.)
        // For minimal viable product, source folders and target root are critical.
    }

    private getFolderPaths(): string[] {
        return this.app.vault
            .getAllLoadedFiles()
            .filter((item): item is TFolder => item instanceof TFolder)
            .map(folder => folder.path)
            .filter(path => path.length > 0)
            .sort((a, b) => a.localeCompare(b));
    }

    private getMarkdownPaths(): string[] {
        return this.app.vault
            .getMarkdownFiles()
            .map(file => file.path)
            .sort((a, b) => a.localeCompare(b));
    }

    private attachPathAutocomplete(inputEl: HTMLInputElement, paths: string[], id: string) {
        inputEl.setAttribute('list', id);
        let datalist = this.containerEl.querySelector(`datalist#${id}`);
        if (!datalist) {
            datalist = this.containerEl.createEl('datalist', { attr: { id } });
            for (const path of paths) {
                datalist.createEl('option', { attr: { value: path } });
            }
        }
    }

    private attachFolderAutocomplete(inputEl: HTMLInputElement, folderPaths: string[], id: string) {
        this.attachPathAutocomplete(inputEl, folderPaths, id);
    }

    private async tryAddSourceFolder(rawPath: string) {
        const normalized = normalizePath(rawPath.trim());
        if (!normalized) {
            new Notice('Source folder path cannot be empty.');
            return;
        }

        const file = this.app.vault.getAbstractFileByPath(normalized);
        if (!(file instanceof TFolder)) {
            new Notice(`Folder not found: ${normalized}`);
            return;
        }

        if (this.plugin.settings.sourceFolders.some(f => f.path === normalized)) {
            new Notice(`Source folder already added: ${normalized}`);
            return;
        }

        this.plugin.settings.sourceFolders.push({
            path: normalized,
            includeSubfolders: false  // 默认不递归
        });
        await this.plugin.saveSettings();
        new Notice(`Added source folder: ${normalized}`);
    }

    private async trySetTargetRoot(rawPath: string) {
        const normalized = normalizePath(rawPath.trim());
        if (!normalized) {
            new Notice('Target root cannot be empty.');
            return;
        }

        const file = this.app.vault.getAbstractFileByPath(normalized);
        if (file && !(file instanceof TFolder)) {
            new Notice(`Target path is not a folder: ${normalized}`);
            return;
        }

        this.plugin.settings.targetRoot = normalized;
        await this.plugin.saveSettings();
        new Notice(`Target root set: ${normalized}`);
    }

    private async tryAddIgnoredFile(rawPath: string) {
        const normalized = normalizePath(rawPath.trim());
        if (!normalized) {
            new Notice('Ignored file path cannot be empty.');
            return;
        }

        const file = this.app.vault.getAbstractFileByPath(normalized);
        if (!(file instanceof TFile) || file.extension !== 'md') {
            new Notice(`Markdown file not found: ${normalized}`);
            return;
        }

        if (this.plugin.settings.ignoredFilePaths.includes(normalized)) {
            new Notice(`Already ignored: ${normalized}`);
            return;
        }

        this.plugin.settings.ignoredFilePaths.push(normalized);
        await this.plugin.saveSettings();
        new Notice(`Added ignored file: ${normalized}`);
    }
}
