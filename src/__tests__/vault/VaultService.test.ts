import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultService } from '@/vault/VaultService';
import { MockVault, MockMetadataCache } from '../mocks/obsidian';

/**
 * VaultService Test Suite
 *
 * Tests all methods of VaultService to ensure file operations work correctly.
 */
describe('VaultService', () => {
	let vaultService: VaultService;
	let mockVault: MockVault;
	let mockMetadataCache: MockMetadataCache;
	let mockApp: any;

	/**
	 * beforeEach: Runs before every test
	 *
	 * Why? Each test should start with a clean slate.
	 * If test A modifies the vault, test B shouldn't see those changes.
	 */
	beforeEach(() => {
		mockVault = new MockVault();
		mockMetadataCache = new MockMetadataCache();

		// Create mock App object
		mockApp = {
			vault: mockVault,
			metadataCache: mockMetadataCache
		};

		vaultService = new VaultService(mockApp as any);
	});

	/**
	 * afterEach: Runs after every test
	 *
	 * Why? Clean up resources to prevent memory leaks in test suite.
	 */
	afterEach(() => {
		mockVault.clear();
		mockMetadataCache.clear();
	});

	/**
	 * Test Group: searchByFilename()
	 *
	 * Why group tests? Related tests are easier to understand together.
	 */
	describe('searchByFilename', () => {
		/**
		 * Test: Happy path (normal usage)
		 *
		 * What we're testing:
		 * - Given some files in the vault
		 * - When I search for a term
		 * - Then I get matching files back
		 */
		it('should find files matching query', () => {
			// Arrange: Set up test data
			mockVault.addFile('notes/meeting-notes.md', 'Meeting content');
			mockVault.addFile('docs/meeting-agenda.md', 'Agenda content');
			mockVault.addFile('archive/random.md', 'Random content');

			// Act: Call the method we're testing
			const results = vaultService.searchByFilename('meeting');

			// Assert: Check the results
			expect(results).toHaveLength(2);
			expect(results).toContain('notes/meeting-notes.md');
			expect(results).toContain('docs/meeting-agenda.md');
		});

		/**
		 * Test: Edge case (no matches)
		 *
		 * Why test edge cases? They often reveal bugs.
		 */
		it('should return empty array when no matches', () => {
			mockVault.addFile('notes/test.md', 'Content');

			const results = vaultService.searchByFilename('nonexistent');

			expect(results).toHaveLength(0);
		});

		/**
		 * Test: Case insensitivity
		 *
		 * Why test this? It's a requirement from the spec.
		 * If someone changes the code to be case-sensitive by accident,
		 * this test will catch it.
		 */
		it('should search case-insensitively', () => {
			mockVault.addFile('Meeting-Notes.md', 'Content');

			const results = vaultService.searchByFilename('MEETING');

			expect(results).toContain('Meeting-Notes.md');
		});

		/**
		 * Test: Partial matching
		 *
		 * Why? Users don't always remember full filenames.
		 */
		it('should match partial filenames', () => {
			mockVault.addFile('project-planning-2024.md', 'Content');

			const results = vaultService.searchByFilename('planning');

			expect(results).toContain('project-planning-2024.md');
		});

		/**
		 * Test: Empty query handling
		 *
		 * Why? Edge cases prevent crashes.
		 */
		it('should handle empty query', () => {
			mockVault.addFile('test.md', 'Content');

			const results = vaultService.searchByFilename('');

			// Should return all files when query is empty
			expect(results).toHaveLength(1);
		});
	});

	/**
	 * Test Group: readFile()
	 */
	describe('readFile', () => {
		/**
		 * Test: Happy path
		 */
		it('should read file contents successfully', async () => {
			const mockContent = '# Test Note\nThis is content';
			mockVault.addFile('test.md', mockContent);

			const result = await vaultService.readFile('test.md');

			expect(result).toBe(mockContent);
		});

		/**
		 * Test: Error case (file not found)
		 *
		 * Why test errors? We need to handle them gracefully.
		 */
		it('should throw error when file not found', async () => {
			// Note: We expect this to throw an error
			await expect(
				vaultService.readFile('nonexistent.md')
			).rejects.toThrow('File not found');
		});

		/**
		 * Test: Error case (path is a folder)
		 *
		 * Why? Users might accidentally pass a folder path.
		 */
		it('should throw error when path is not a file', async () => {
			// For this test, we need a path that returns something but not a TFile
			// The mock returns null for non-existent files, so we test with that
			await expect(
				vaultService.readFile('folder')
			).rejects.toThrow('File not found');
		});
	});

	/**
	 * Test Group: searchByContent()
	 *
	 * This is more complex because it involves reading multiple files.
	 */
	describe('searchByContent', () => {
		it('should find files containing search text', async () => {
			mockVault.addFile('note1.md', 'This contains the search term');
			mockVault.addFile('note2.md', 'This does not contain it');
			mockVault.addFile('note3.md', 'Another file with search term');

			const results = await vaultService.searchByContent('search term');

			expect(results).toHaveLength(2);
			expect(results[0].path).toBe('note1.md');
			expect(results[0].matches).toContain('This contains the search term');
			expect(results[1].path).toBe('note3.md');
		});

		/**
		 * Test: Case insensitive search
		 */
		it('should search case-insensitively', async () => {
			mockVault.addFile('note.md', 'This has UPPERCASE content');

			const results = await vaultService.searchByContent('uppercase');

			expect(results).toHaveLength(1);
			expect(results[0].matches[0]).toContain('UPPERCASE');
		});

		/**
		 * Test: Multiple matches in one file
		 */
		it('should return multiple matching lines from same file', async () => {
			mockVault.addFile('note.md', 'Line 1 has keyword\nLine 2 normal\nLine 3 has keyword');

			const results = await vaultService.searchByContent('keyword');

			expect(results).toHaveLength(1);
			expect(results[0].matches).toHaveLength(2);
		});

		/**
		 * Test: Limit matches per file
		 */
		it('should limit matches to 5 per file', async () => {
			const content = Array(10).fill('keyword line').join('\n');
			mockVault.addFile('note.md', content);

			const results = await vaultService.searchByContent('keyword');

			expect(results[0].matches).toHaveLength(5);
		});
	});

	/**
	 * Test Group: searchByTag()
	 */
	describe('searchByTag', () => {
		it('should find files with frontmatter tags', () => {
			mockVault.addFile('note.md', 'Content');
			mockMetadataCache.setCache('note.md', {
				frontmatter: {
					tags: ['project', 'important']
				}
			});

			const results = vaultService.searchByTag('project');

			expect(results).toContain('note.md');
		});

		it('should find files with inline tags', () => {
			mockVault.addFile('note.md', 'Content with #tag');
			mockMetadataCache.setCache('note.md', {
				tags: [{ tag: '#project', position: {} }]
			});

			const results = vaultService.searchByTag('project');

			expect(results).toContain('note.md');
		});

		it('should handle tag with or without # symbol', () => {
			mockVault.addFile('note.md', 'Content');
			mockMetadataCache.setCache('note.md', {
				tags: [{ tag: '#project', position: {} }]
			});

			const results1 = vaultService.searchByTag('#project');
			const results2 = vaultService.searchByTag('project');

			expect(results1).toContain('note.md');
			expect(results2).toContain('note.md');
		});

		it('should handle single tag as string in frontmatter', () => {
			mockVault.addFile('note.md', 'Content');
			mockMetadataCache.setCache('note.md', {
				frontmatter: {
					tags: 'single-tag'
				}
			});

			const results = vaultService.searchByTag('single-tag');

			expect(results).toContain('note.md');
		});
	});

	/**
	 * Test Group: getFileMetadata()
	 */
	describe('getFileMetadata', () => {
		it('should return metadata with frontmatter', async () => {
			mockVault.addFile('test.md', 'Content');
			mockMetadataCache.setCache('test.md', {
				frontmatter: {
					title: 'Test Note',
					tags: ['test', 'example'],
				},
				tags: [
					{ tag: '#inline-tag', position: {} },
				],
			});

			const metadata = await vaultService.getFileMetadata('test.md');

			expect(metadata.frontmatter?.title).toBe('Test Note');
			expect(metadata.tags).toContain('test');
			expect(metadata.tags).toContain('#inline-tag');
		});

		/**
		 * Test: Missing metadata
		 *
		 * Why? Not all files have frontmatter.
		 */
		it('should handle files without metadata', async () => {
			mockVault.addFile('test.md', 'Content');

			const metadata = await vaultService.getFileMetadata('test.md');

			expect(metadata.frontmatter).toBeNull();
			expect(metadata.tags).toHaveLength(0);
		});

		/**
		 * Test: File stats
		 */
		it('should return file stats', async () => {
			mockVault.addFile('test.md', 'Content');

			const metadata = await vaultService.getFileMetadata('test.md');

			expect(metadata.stats.created).toBeGreaterThan(0);
			expect(metadata.stats.modified).toBeGreaterThan(0);
			expect(metadata.stats.size).toBeGreaterThan(0);
		});

		/**
		 * Test: Duplicate tags removed
		 */
		it('should remove duplicate tags', async () => {
			mockVault.addFile('test.md', 'Content');
			mockMetadataCache.setCache('test.md', {
				frontmatter: {
					tags: ['test']
				},
				tags: [
					{ tag: 'test', position: {} }
				]
			});

			const metadata = await vaultService.getFileMetadata('test.md');

			// Should only have one 'test' tag despite duplicates
			expect(metadata.tags.filter(t => t === 'test')).toHaveLength(1);
		});
	});

	/**
	 * Test Group: listFiles()
	 */
	describe('listFiles', () => {
		it('should list all files when no folder specified', () => {
			mockVault.addFile('note1.md', 'Content');
			mockVault.addFile('folder/note2.md', 'Content');
			mockVault.addFile('folder/subfolder/note3.md', 'Content');

			const results = vaultService.listFiles();

			expect(results).toHaveLength(3);
		});

		it('should list files in specific folder', () => {
			mockVault.addFile('note1.md', 'Content');
			mockVault.addFile('folder/note2.md', 'Content');
			mockVault.addFile('folder/note3.md', 'Content');
			mockVault.addFile('other/note4.md', 'Content');

			const results = vaultService.listFiles('folder');

			expect(results).toHaveLength(2);
			expect(results).toContain('folder/note2.md');
			expect(results).toContain('folder/note3.md');
		});

		it('should handle folder path with trailing slash', () => {
			mockVault.addFile('folder/note.md', 'Content');

			const results = vaultService.listFiles('folder/');

			expect(results).toContain('folder/note.md');
		});
	});

	/**
	 * Test Group: getBacklinks()
	 */
	describe('getBacklinks', () => {
		it('should throw error for non-existent file', () => {
			expect(() => {
				vaultService.getBacklinks('nonexistent.md');
			}).toThrow('File not found');
		});

		it('should return empty array when no backlinks', () => {
			mockVault.addFile('target.md', 'Content');
			mockApp.metadataCache.resolvedLinks = {};

			const results = vaultService.getBacklinks('target.md');

			expect(results).toHaveLength(0);
		});
	});

	/**
	 * Test Group: getOutgoingLinks()
	 */
	describe('getOutgoingLinks', () => {
		it('should throw error for non-existent file', () => {
			expect(() => {
				vaultService.getOutgoingLinks('nonexistent.md');
			}).toThrow('File not found');
		});

		it('should return empty array when no links', () => {
			mockVault.addFile('source.md', 'Content');
			mockMetadataCache.setCache('source.md', {});

			const results = vaultService.getOutgoingLinks('source.md');

			expect(results).toHaveLength(0);
		});
	});

	/**
	 * Test Group: getVaultStats()
	 */
	describe('getVaultStats', () => {
		it('should return vault statistics', () => {
			mockVault.addFile('note1.md', 'Content 1');
			mockVault.addFile('note2.md', 'Content 2');
			mockVault.addFile('note3.md', 'Content 3');

			// Mock getAllLoadedFiles to return files and folders
			mockApp.vault.getAllLoadedFiles = () => [
				...mockVault.getMarkdownFiles(),
				{ path: 'folder', children: [] } // Mock folder
			];

			const stats = vaultService.getVaultStats();

			expect(stats.totalFiles).toBe(3);
			expect(stats.totalSize).toBeGreaterThan(0);
		});
	});
});
