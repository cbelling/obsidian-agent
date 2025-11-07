import { vi } from 'vitest';
import { TFile } from 'obsidian';

/**
 * Mock Obsidian API Utilities
 *
 * These classes provide fake implementations of Obsidian APIs for testing.
 * They store data in memory instead of on disk.
 */

/**
 * MockTFile - extends real TFile for instanceof checks
 */
class MockTFile extends TFile {
	constructor(path: string, size: number) {
		super();
		this.path = path;
		this.basename = path.split('/').pop()?.replace('.md', '') || '';
		this.stat = {
			ctime: Date.now(),
			mtime: Date.now(),
			size
		};
		this.parent = {
			path: path.split('/').slice(0, -1).join('/') || '/'
		} as any;
	}
}

/**
 * MockVault
 *
 * A fake Obsidian Vault that stores files in memory instead of disk.
 * This lets us test VaultService without needing an actual Obsidian vault.
 */
export class MockVault {
	// Store files in a Map: path → content
	private files: Map<string, string> = new Map();
	private fileObjects: Map<string, MockTFile> = new Map();

	/**
	 * Add a fake file (used in test setup)
	 */
	addFile(path: string, content: string): void {
		this.files.set(path, content);
		const fileObj = new MockTFile(path, content.length);
		this.fileObjects.set(path, fileObj);
	}

	/**
	 * Mock: Vault.getAbstractFileByPath()
	 * Returns a fake TFile object if the file exists
	 */
	getAbstractFileByPath(path: string): any {
		return this.fileObjects.get(path) || null;
	}

	/**
	 * Mock: Vault.read()
	 * Returns the content of a fake file
	 */
	async read(file: any): Promise<string> {
		return this.files.get(file.path) || '';
	}

	/**
	 * Mock: Vault.getMarkdownFiles()
	 * Returns all fake files as TFile objects
	 */
	getMarkdownFiles(): MockTFile[] {
		return Array.from(this.fileObjects.values());
	}

	/**
	 * Mock: Vault.getFiles()
	 * Returns all files (not just markdown)
	 */
	getFiles(): any[] {
		return this.getMarkdownFiles();
	}

	/**
	 * Clear all files (used between tests)
	 */
	clear(): void {
		this.files.clear();
		this.fileObjects.clear();
	}
}

/**
 * MockMetadataCache
 *
 * A fake Obsidian MetadataCache for testing file metadata operations.
 */
export class MockMetadataCache {
	// Store metadata in a Map: path → metadata
	private cache: Map<string, any> = new Map();
	private backlinks: Map<string, any> = new Map();

	/**
	 * Add fake metadata for a file (used in test setup)
	 */
	setCache(path: string, metadata: any): void {
		this.cache.set(path, metadata);
	}

	/**
	 * Set backlinks for a file
	 */
	setBacklinks(path: string, backlinks: string[]): void {
		const backlinkMap = new Map();
		backlinks.forEach(source => {
			backlinkMap.set(source, [{ position: {} }]);
		});
		this.backlinks.set(path, { data: backlinkMap });
	}

	/**
	 * Mock: MetadataCache.getFileCache()
	 */
	getFileCache(file: any): any {
		return this.cache.get(file.path);
	}

	/**
	 * Mock: MetadataCache.getBacklinksForFile()
	 */
	getBacklinksForFile(file: any): any {
		return this.backlinks.get(file.path) || { data: new Map() };
	}

	/**
	 * Clear all metadata (used between tests)
	 */
	clear(): void {
		this.cache.clear();
		this.backlinks.clear();
	}
}

/**
 * Helper: Create a complete mock app with vault and metadata cache
 */
export function createMockApp(): any {
	return {
		vault: new MockVault(),
		metadataCache: new MockMetadataCache(),
	};
}
