export interface Message {
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
}

export interface ClaudeChatSettings {
	apiKey: string;
}

export const DEFAULT_SETTINGS: ClaudeChatSettings = {
	apiKey: ''
};

export const VIEW_TYPE_CHAT = 'claude-chat-view';
