import { describe, it, expect, beforeEach } from 'vitest';
import { createVaultTools } from '@/vault/VaultTools';
import { VaultService } from '@/vault/VaultService';
import { MockVault, MockMetadataCache } from '../mocks/obsidian';

/**
 * VaultTools Integration Tests
 *
 * Tests that tools correctly interact with VaultService.
 * This is "integration" because we're testing two layers together:
 * 1. Tool input parsing (Zod schemas)
 * 2. VaultService execution
 */
describe('VaultTools Integration', () => {
	let tools: ReturnType<typeof createVaultTools>;
	let vaultService: VaultService;
	let mockVault: MockVault;
	let mockMetadataCache: MockMetadataCache;
	let mockApp: any;

	beforeEach(() => {
		mockVault = new MockVault();
		mockMetadataCache = new MockMetadataCache();
		mockApp = {
			vault: mockVault,
			metadataCache: mockMetadataCache
		};
		vaultService = new VaultService(mockApp);
		tools = createVaultTools(vaultService);
	});

	/**
	 * Helper: Find tool by name
	 */
	function getTool(name: string) {
		return tools.find(t => t.name === name)!;
	}

	/**
	 * Test: search_vault_by_name tool
	 */
	describe('search_vault_by_name', () => {
		it('should search and format results', async () => {
			mockVault.addFile('meeting-notes.md', 'Content');
			mockVault.addFile('project-meeting.md', 'Content');

			const tool = getTool('search_vault_by_name');
			const result = await tool.invoke({ query: 'meeting' });

			expect(result).toContain('Found 2 file(s)');
			expect(result).toContain('meeting-notes.md');
			expect(result).toContain('project-meeting.md');
		});

		it('should return message when no results', async () => {
			const tool = getTool('search_vault_by_name');
			const result = await tool.invoke({ query: 'nonexistent' });

			expect(result).toContain('No files found');
			expect(result).toContain('nonexistent');
		});

		it('should limit results to 20 files', async () => {
			// Add 25 files
			for (let i = 0; i < 25; i++) {
				mockVault.addFile(`note-${i}.md`, 'Content');
			}

			const tool = getTool('search_vault_by_name');
			const result = await tool.invoke({ query: 'note' });

			expect(result).toContain('Found 25 file(s)');
			expect(result).toContain('5 more results available');
		});

		it('should handle tool execution errors gracefully', async () => {
			// Break the vault service
			mockApp.vault.getMarkdownFiles = () => {
				throw new Error('Vault error');
			};

			const tool = getTool('search_vault_by_name');
			const result = await tool.invoke({ query: 'test' });

			expect(result).toContain('Error searching files');
		});
	});

	/**
	 * Test: search_vault_by_content tool
	 */
	describe('search_vault_by_content', () => {
		it('should search content and return matches', async () => {
			mockVault.addFile('note1.md', 'This has the keyword in it');
			mockVault.addFile('note2.md', 'This does not have it');
			mockVault.addFile('note3.md', 'Another file with keyword here');

			const tool = getTool('search_vault_by_content');
			const result = await tool.invoke({ query: 'keyword' });

			expect(result).toContain('Found "keyword" in 2 file(s)');
			expect(result).toContain('note1.md');
			expect(result).toContain('note3.md');
			expect(result).toContain('This has the keyword');
		});

		it('should return message when no matches', async () => {
			mockVault.addFile('note.md', 'Some content');

			const tool = getTool('search_vault_by_content');
			const result = await tool.invoke({ query: 'missing' });

			expect(result).toContain('No files found containing');
			expect(result).toContain('missing');
		});

		it('should limit results to 10 files', async () => {
			// Add 15 files with keyword
			for (let i = 0; i < 15; i++) {
				mockVault.addFile(`note-${i}.md`, 'keyword content');
			}

			const tool = getTool('search_vault_by_content');
			const result = await tool.invoke({ query: 'keyword' });

			expect(result).toContain('5 more files available');
		});
	});

	/**
	 * Test: search_vault_by_tag tool
	 */
	describe('search_vault_by_tag', () => {
		it('should find files with tags', async () => {
			mockVault.addFile('note1.md', 'Content');
			mockVault.addFile('note2.md', 'Content');
			mockMetadataCache.setCache('note1.md', {
				tags: [{ tag: '#project', position: {} }]
			});
			mockMetadataCache.setCache('note2.md', {
				frontmatter: { tags: ['project'] }
			});

			const tool = getTool('search_vault_by_tag');
			const result = await tool.invoke({ tag: 'project' });

			expect(result).toContain('Found 2 file(s)');
			expect(result).toContain('note1.md');
			expect(result).toContain('note2.md');
		});

		it('should handle tag with # symbol', async () => {
			mockVault.addFile('note.md', 'Content');
			mockMetadataCache.setCache('note.md', {
				tags: [{ tag: '#important', position: {} }]
			});

			const tool = getTool('search_vault_by_tag');
			const result = await tool.invoke({ tag: '#important' });

			expect(result).toContain('Found 1 file(s)');
		});

		it('should return message when no tags found', async () => {
			const tool = getTool('search_vault_by_tag');
			const result = await tool.invoke({ tag: 'nonexistent' });

			expect(result).toContain('No files found with tag');
		});
	});

	/**
	 * Test: read_vault_file tool
	 */
	describe('read_vault_file', () => {
		it('should read and return file content', async () => {
			const content = '# My Note\n\nThis is my note content.';
			mockVault.addFile('test.md', content);

			const tool = getTool('read_vault_file');
			const result = await tool.invoke({ path: 'test.md' });

			expect(result).toContain('Content of "test.md"');
			expect(result).toContain(content);
		});

		/**
		 * Test: Content truncation
		 *
		 * Large files should be truncated to avoid overwhelming the LLM.
		 */
		it('should truncate large files', async () => {
			const largeContent = 'x'.repeat(5000);
			mockVault.addFile('large.md', largeContent);

			const tool = getTool('read_vault_file');
			const result = await tool.invoke({ path: 'large.md' });

			expect(result).toContain('truncated');
			expect(result).toContain('4000 characters');
			expect(result.length).toBeLessThan(largeContent.length);
		});

		/**
		 * Test: Error handling
		 */
		it('should return error message for missing file', async () => {
			const tool = getTool('read_vault_file');
			const result = await tool.invoke({ path: 'missing.md' });

			expect(result).toContain('Error reading file');
		});
	});

	/**
	 * Test: list_vault_files tool
	 */
	describe('list_vault_files', () => {
		it('should list all files when no folder specified', async () => {
			mockVault.addFile('note1.md', 'Content');
			mockVault.addFile('folder/note2.md', 'Content');
			mockVault.addFile('folder/note3.md', 'Content');

			const tool = getTool('list_vault_files');
			const result = await tool.invoke({});

			expect(result).toContain('Found 3 file(s)');
		});

		it('should list files in specific folder', async () => {
			mockVault.addFile('note1.md', 'Content');
			mockVault.addFile('folder/note2.md', 'Content');
			mockVault.addFile('folder/note3.md', 'Content');
			mockVault.addFile('other/note4.md', 'Content');

			const tool = getTool('list_vault_files');
			const result = await tool.invoke({ folder: 'folder' });

			expect(result).toContain('Found 2 file(s)');
			expect(result).toContain('folder/note2.md');
			expect(result).toContain('folder/note3.md');
			expect(result).not.toContain('note1.md');
			expect(result).not.toContain('other/note4.md');
		});

		it('should limit display to 50 files', async () => {
			// Add 60 files
			for (let i = 0; i < 60; i++) {
				mockVault.addFile(`note-${i}.md`, 'Content');
			}

			const tool = getTool('list_vault_files');
			const result = await tool.invoke({});

			expect(result).toContain('Found 60 file(s)');
			expect(result).toContain('and 10 more');
		});

		it('should return message when no files', async () => {
			const tool = getTool('list_vault_files');
			const result = await tool.invoke({});

			expect(result).toContain('No files found in vault');
		});
	});

	/**
	 * Test: get_file_metadata tool
	 */
	describe('get_file_metadata', () => {
		it('should return formatted metadata', async () => {
			mockVault.addFile('test.md', 'Content');
			mockMetadataCache.setCache('test.md', {
				frontmatter: {
					title: 'Test Note',
					author: 'John Doe'
				},
				tags: [{ tag: '#important', position: {} }]
			});

			const tool = getTool('get_file_metadata');
			const result = await tool.invoke({ path: 'test.md' });

			expect(result).toContain('Metadata for "test.md"');
			expect(result).toContain('Frontmatter:');
			expect(result).toContain('title');
			expect(result).toContain('Test Note');
			expect(result).toContain('Tags:');
			expect(result).toContain('#important');
			expect(result).toContain('Stats:');
			expect(result).toContain('Created:');
			expect(result).toContain('Modified:');
			expect(result).toContain('Size:');
		});

		it('should handle file without metadata', async () => {
			mockVault.addFile('test.md', 'Content');

			const tool = getTool('get_file_metadata');
			const result = await tool.invoke({ path: 'test.md' });

			expect(result).toContain('Metadata for "test.md"');
			expect(result).toContain('Stats:');
			// Should not contain frontmatter section
			expect(result).not.toContain('Frontmatter:');
		});

		it('should handle errors gracefully', async () => {
			const tool = getTool('get_file_metadata');
			const result = await tool.invoke({ path: 'missing.md' });

			expect(result).toContain('Error getting metadata');
		});
	});

	/**
	 * Test: get_file_backlinks tool
	 */
	describe('get_file_backlinks', () => {
		it('should return backlinks', async () => {
			mockVault.addFile('target.md', 'Content');
			mockVault.addFile('source1.md', 'Links to target');
			mockVault.addFile('source2.md', 'Also links to target');

			// Mock resolvedLinks
			mockApp.metadataCache.resolvedLinks = {
				'source1.md': { 'target.md': 1 },
				'source2.md': { 'target.md': 1 }
			};

			const tool = getTool('get_file_backlinks');
			const result = await tool.invoke({ path: 'target.md' });

			expect(result).toContain('Files that link to "target.md"');
			expect(result).toContain('source1.md');
			expect(result).toContain('source2.md');
		});

		it('should handle no backlinks', async () => {
			mockVault.addFile('target.md', 'Content');
			mockApp.metadataCache.resolvedLinks = {};

			const tool = getTool('get_file_backlinks');
			const result = await tool.invoke({ path: 'target.md' });

			expect(result).toContain('No backlinks found');
		});
	});

	/**
	 * Test: get_outgoing_links tool
	 */
	describe('get_outgoing_links', () => {
		it('should return outgoing links', async () => {
			mockVault.addFile('source.md', 'Links to others');
			mockVault.addFile('target1.md', 'Target 1');
			mockVault.addFile('target2.md', 'Target 2');

			mockMetadataCache.setCache('source.md', {
				links: [
					{ link: 'target1', position: {} },
					{ link: 'target2', position: {} }
				]
			});

			// Mock getFirstLinkpathDest
			mockApp.metadataCache.getFirstLinkpathDest = (link: string) => {
				if (link === 'target1') return { path: 'target1.md' };
				if (link === 'target2') return { path: 'target2.md' };
				return null;
			};

			const tool = getTool('get_outgoing_links');
			const result = await tool.invoke({ path: 'source.md' });

			expect(result).toContain('Files linked from "source.md"');
			expect(result).toContain('target1.md');
			expect(result).toContain('target2.md');
		});

		it('should handle no outgoing links', async () => {
			mockVault.addFile('source.md', 'No links');
			mockMetadataCache.setCache('source.md', {});

			const tool = getTool('get_outgoing_links');
			const result = await tool.invoke({ path: 'source.md' });

			expect(result).toContain('No outgoing links found');
		});
	});

	/**
	 * Test: All tools have correct structure
	 */
	describe('Tool structure', () => {
		it('should have 8 tools', () => {
			expect(tools).toHaveLength(8);
		});

		it('should have all required tool properties', () => {
			tools.forEach(tool => {
				expect(tool.name).toBeDefined();
				expect(tool.description).toBeDefined();
				expect(tool.schema).toBeDefined();
				expect(typeof tool.invoke).toBe('function');
			});
		});

		it('should have unique tool names', () => {
			const names = tools.map(t => t.name);
			const uniqueNames = new Set(names);
			expect(uniqueNames.size).toBe(names.length);
		});
	});
});
