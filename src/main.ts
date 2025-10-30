import { Plugin } from 'obsidian';
import { ChatView } from './ChatView';
import { ClaudeChatSettingTab } from './settings';
import { ClaudeChatSettings, DEFAULT_SETTINGS, VIEW_TYPE_CHAT } from './types';

export default class ClaudeChatPlugin extends Plugin {
	settings: ClaudeChatSettings;
	private chatView: ChatView | null = null;

	async onload() {
		await this.loadSettings();

		// Register the chat view
		this.registerView(
			VIEW_TYPE_CHAT,
			(leaf) => {
				this.chatView = new ChatView(leaf, this);
				return this.chatView;
			}
		);

		// Add ribbon icon to open chat
		this.addRibbonIcon('message-circle', 'Open Claude Chat', () => {
			this.activateView();
		});

		// Add command to open chat
		this.addCommand({
			id: 'open-claude-chat',
			name: 'Open Claude Chat',
			callback: () => {
				this.activateView();
			}
		});

		// Add settings tab
		this.addSettingTab(new ClaudeChatSettingTab(this.app, this));

	}

	async onunload() {
		// Detach all leaves of our view type
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_CHAT);
	}

	async activateView() {
		const { workspace } = this.app;

		// Check if view is already open
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_CHAT)[0];

		if (!leaf) {
			// Create new leaf in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: VIEW_TYPE_CHAT,
					active: true,
				});
				leaf = rightLeaf;
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// Update API key in chat view if it exists
		if (this.chatView) {
			this.chatView.updateApiKey(this.settings.apiKey);
		}
	}
}
