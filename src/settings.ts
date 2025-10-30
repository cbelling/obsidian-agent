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

		containerEl.createEl('h2', { text: 'Claude Chat Settings' });

		containerEl.createEl('p', {
			text: 'Configure your Anthropic API key to start chatting with Claude.',
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
	}
}
