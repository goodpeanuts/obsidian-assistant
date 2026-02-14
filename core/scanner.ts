import { App, TFile, TFolder } from 'obsidian';
import { ArchiveSettings } from '../settings';

export class Scanner {
    constructor(private app: App, private settings: ArchiveSettings) { }

    getFilesToArchive(): TFile[] {
        const files: TFile[] = [];
        const sourceFolders = this.settings.sourceFolders;

        for (const folderConfig of sourceFolders) {
            const folder = this.app.vault.getAbstractFileByPath(folderConfig.path);
            if (folder instanceof TFolder) {
                this.scanFolder(folder, files, folderConfig.includeSubfolders);
            }
        }

        return files;
    }

    private scanFolder(folder: TFolder, files: TFile[], includeSubfolders: boolean) {
        const ignored = new Set(this.settings.ignoredFilePaths || []);
        for (const child of folder.children) {
            if (child instanceof TFile && child.extension === 'md') {
                if (!ignored.has(child.path)) {
                    files.push(child);
                }
            } else if (child instanceof TFolder && includeSubfolders) {
                this.scanFolder(child, files, includeSubfolders);
            }
        }
    }
}
