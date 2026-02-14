import { Plugin } from 'obsidian';
import { AssistantSettingTab, ArchiveSettings, DEFAULT_SETTINGS } from './settings';
import { Scanner } from './core/scanner';
import { TimeResolver } from './core/time-resolver';
import { ArchivePlanner, ArchiveExecutor } from './core/archiver';
import { ArchiveModal } from './ui/archive-modal';

export default class AssistantPlugin extends Plugin {
    settings!: ArchiveSettings;
    scanner!: Scanner;
    timeResolver!: TimeResolver;
    planner!: ArchivePlanner;
    executor!: ArchiveExecutor;

    async onload() {
        await this.loadSettings();

        // Initialize Core Modules
        this.scanner = new Scanner(this.app, this.settings);
        this.timeResolver = new TimeResolver(this.settings, this.app);
        this.planner = new ArchivePlanner(this.settings, this.timeResolver);
        this.executor = new ArchiveExecutor(this.app);

        // Add Settings Tab
        this.addSettingTab(new AssistantSettingTab(this.app, this));

        // Register Command
        this.addCommand({
            id: 'archive-notes-by-time',
            name: 'Archive notes by created time',
            callback: () => {
                new ArchiveModal(
                    this.app,
                    this.settings,
                    this.scanner,
                    this.timeResolver,
                    this.planner,
                    this.executor
                ).open();
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // Re-initialize modules that depend on settings if needed
        // For now, they reference the settings object directly or are re-instantiated
        this.scanner = new Scanner(this.app, this.settings);
        this.timeResolver = new TimeResolver(this.settings, this.app);
        this.planner = new ArchivePlanner(this.settings, this.timeResolver);
    }
}
