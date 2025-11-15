import { App, PluginSettingTab, Setting } from 'obsidian';
import ClaudeChatPlugin from './main';

export class ClaudeChatSettingTab extends PluginSettingTab {
	plugin: ClaudeChatPlugin;

	constructor(app: App, plugin: ClaudeChatPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Obsidian Agent Settings' });

		containerEl.createEl('p', {
			text: 'Configure your Anthropic API key to use your AI agent powered by Claude.',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('Anthropic API Key')
			.setDesc(
				createFragment((frag) => {
					frag.appendText('Enter your Anthropic API key. Get one at ');
					frag.createEl('a', {
						text: 'console.anthropic.com',
						href: 'https://console.anthropic.com/settings/keys'
					});
				})
			)
			.addText((text) =>
				text
					.setPlaceholder('sk-ant-...')
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			)
			.then((setting) => {
				// Make the input a password field
				setting.controlEl.querySelector('input')?.setAttribute('type', 'password');
			});

		containerEl.createEl('p', {
			text: 'Note: Your API key is stored locally and only used to communicate with the Anthropic API.',
			cls: 'mod-warning'
		});

		// Data retention section
		containerEl.createEl('h2', { text: 'Data Retention' });

		containerEl.createEl('p', {
			text: 'Configure how long conversation history is stored and when old data is automatically cleaned up.',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('Enable Auto Cleanup')
			.setDesc('Automatically delete old conversations based on retention settings')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableAutoCleanup)
					.onChange(async (value) => {
						this.plugin.settings.enableAutoCleanup = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.enableAutoCleanup) {
			new Setting(containerEl)
				.setName('Retention Period (Days)')
				.setDesc('Delete conversations older than this many days (1-365)')
				.addText((text) =>
					text
						.setPlaceholder('30')
						.setValue(String(this.plugin.settings.retentionDays))
						.onChange(async (value) => {
							const days = parseInt(value);
							if (!isNaN(days) && days >= 1 && days <= 365) {
								this.plugin.settings.retentionDays = days;
								await this.plugin.saveSettings();
							}
						})
				);

			new Setting(containerEl)
				.setName('Max History Size')
				.setDesc('Maximum number of messages to keep per conversation (10-1000)')
				.addText((text) =>
					text
						.setPlaceholder('100')
						.setValue(String(this.plugin.settings.maxHistorySize))
						.onChange(async (value) => {
							const size = parseInt(value);
							if (!isNaN(size) && size >= 10 && size <= 1000) {
								this.plugin.settings.maxHistorySize = size;
								await this.plugin.saveSettings();
							}
						})
				);
		}
	}
}
