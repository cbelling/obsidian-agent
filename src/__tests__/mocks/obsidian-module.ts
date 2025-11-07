/**
 * Mock Obsidian Module
 *
 * This file mocks the 'obsidian' package for testing.
 * It exports stub classes that match the Obsidian API structure.
 */

export class TFile {
	path: string = '';
	basename: string = '';
	stat: { ctime: number; mtime: number; size: number } = {
		ctime: Date.now(),
		mtime: Date.now(),
		size: 0
	};
	parent: any = null;

	constructor(path?: string) {
		if (path) {
			this.path = path;
			this.basename = path.split('/').pop()?.replace('.md', '') || '';
			this.stat = { ctime: Date.now(), mtime: Date.now(), size: 100 };
			this.parent = { path: path.split('/').slice(0, -1).join('/') || '/' };
		}
	}
}

export class TFolder {
	path: string;
	children: any[];

	constructor(path: string) {
		this.path = path;
		this.children = [];
	}
}

export class TAbstractFile {
	path: string;
	constructor(path: string) {
		this.path = path;
	}
}

export class Vault {}
export class MetadataCache {}
export class App {}
export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class Notice {}
export class ItemView {}
export class WorkspaceLeaf {}

export interface CachedMetadata {
	frontmatter?: Record<string, any>;
	tags?: Array<{ tag: string; position: any }>;
	links?: Array<{ link: string; position: any }>;
}
