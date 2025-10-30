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

		// LangSmith section
		containerEl.createEl('h2', { text: 'LangSmith Tracing (Optional)' });

		containerEl.createEl('p', {
			text: 'Enable LangSmith to track and monitor your agent conversations, tool calls, and LLM interactions.',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('Enable LangSmith Tracing')
			.setDesc('Turn on tracing to monitor agent behavior and debug issues')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.langsmithEnabled)
					.onChange(async (value) => {
						this.plugin.settings.langsmithEnabled = value;
						await this.plugin.saveSettings();
						// Refresh display to show/hide other settings
						this.display();
					})
			);

		if (this.plugin.settings.langsmithEnabled) {
			new Setting(containerEl)
				.setName('LangSmith API Key')
				.setDesc(
					createFragment((frag) => {
						frag.appendText('Enter your LangSmith API key. Get one at ');
						frag.createEl('a', {
							text: 'smith.langchain.com',
							href: 'https://smith.langchain.com/settings'
						});
					})
				)
				.addText((text) =>
					text
						.setPlaceholder('lsv2_pt_...')
						.setValue(this.plugin.settings.langsmithApiKey)
						.onChange(async (value) => {
							this.plugin.settings.langsmithApiKey = value;
							await this.plugin.saveSettings();
						})
				)
				.then((setting) => {
					// Make the input a password field
					setting.controlEl.querySelector('input')?.setAttribute('type', 'password');
				});

			new Setting(containerEl)
				.setName('LangSmith Project')
				.setDesc('Project name for organizing traces (defaults to "obsidian-agent")')
				.addText((text) =>
					text
						.setPlaceholder('obsidian-agent')
						.setValue(this.plugin.settings.langsmithProject)
						.onChange(async (value) => {
							this.plugin.settings.langsmithProject = value || 'obsidian-agent';
							await this.plugin.saveSettings();
						})
				);

			containerEl.createEl('p', {
				text: 'View your traces at: https://smith.langchain.com',
				cls: 'mod-success'
			});
		}
	}
}
