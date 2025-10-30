export interface Message {
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
}

export interface ClaudeChatSettings {
	apiKey: string;
	langsmithApiKey: string;
	langsmithProject: string;
	langsmithEnabled: boolean;
}

export const DEFAULT_SETTINGS: ClaudeChatSettings = {
	apiKey: '',
	langsmithApiKey: '',
	langsmithProject: 'obsidian-agent',
	langsmithEnabled: false
};

export const VIEW_TYPE_CHAT = 'claude-chat-view';
