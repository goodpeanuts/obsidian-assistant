import { App, PluginSettingTab, Setting } from 'obsidian';
import AssistantPlugin from './main';

export interface ArchiveSettings {
    sourceFolders: string[];
    targetRoot: string;
    includeSubfolders: boolean;
    timeSourceOrder: ("frontmatter" | "filename" | "ctime")[];
    frontmatterKey: string;
    conflictStrategy: "rename" | "skip";
}

export const DEFAULT_SETTINGS: ArchiveSettings = {
    sourceFolders: ["Inbox"],
    targetRoot: "Archive",
    includeSubfolders: true,
    timeSourceOrder: ["frontmatter", "filename", "ctime"],
    frontmatterKey: "created",
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

        new Setting(containerEl)
            .setName('Source Folders')
            .setDesc('Folders to scan for notes. Separate by newline.')
            .addTextArea(text => text
                .setPlaceholder('Inbox\nClips')
                .setValue(this.plugin.settings.sourceFolders.join('\n'))
                .onChange(async (value) => {
                    this.plugin.settings.sourceFolders = value.split('\n').filter(s => s.trim().length > 0);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Target Root')
            .setDesc('Root folder where archives will be stored.')
            .addText(text => text
                .setPlaceholder('Archive')
                .setValue(this.plugin.settings.targetRoot)
                .onChange(async (value) => {
                    this.plugin.settings.targetRoot = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Frontmatter Key')
            .setDesc('Key used to read creation date from frontmatter.')
            .addText(text => text
                .setPlaceholder('created')
                .setValue(this.plugin.settings.frontmatterKey)
                .onChange(async (value) => {
                    this.plugin.settings.frontmatterKey = value;
                    await this.plugin.saveSettings();
                }));

        // Extended settings can be added here (Time Source Order, Conflict Strategy etc.)
        // For minimal viable product, source folders and target root are critical.
    }
}
