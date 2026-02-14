import { TFile } from 'obsidian';
import { ArchiveSettings } from '../settings';

export interface CreatedTimeResolution {
    date: Date | null;
    error: string | null;
}

export class TimeResolver {
    constructor(private settings: ArchiveSettings, private app: any) { }

    resolveCreatedTime(file: TFile): Date | null {
        return this.resolveCreatedTimeWithError(file).date;
    }

    resolveCreatedTimeWithError(file: TFile): CreatedTimeResolution {
        const key = this.settings.frontmatterKey || 'createdTime';
        const metadata = this.app.metadataCache.getFileCache(file);
        const frontmatter = metadata?.frontmatter;
        if (!frontmatter) {
            return { date: null, error: 'Missing frontmatter.' };
        }

        const value = frontmatter[key];
        if (value === undefined || value === null || `${value}`.trim().length === 0) {
            return { date: null, error: `Missing ${key}.` };
        }

        const parsed = this.parseCreatedTime(value);
        if (!parsed) {
            return { date: null, error: `Invalid ${key}: ${value}` };
        }

        return { date: parsed, error: null };
    }

    private parseCreatedTime(value: unknown): Date | null {
        const raw = typeof value === 'string' ? value.trim() : `${value}`.trim();
        if (!raw) return null;

        const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
        if (match) {
            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);
            const hour = Number(match[4] ?? 0);
            const minute = Number(match[5] ?? 0);
            const second = Number(match[6] ?? 0);
            const date = new Date(year, month - 1, day, hour, minute, second);

            if (
                date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day &&
                date.getHours() === hour &&
                date.getMinutes() === minute &&
                date.getSeconds() === second
            ) {
                return date;
            }

            return null;
        }

        const fallback = new Date(raw);
        return Number.isNaN(fallback.getTime()) ? null : fallback;
    }
}
