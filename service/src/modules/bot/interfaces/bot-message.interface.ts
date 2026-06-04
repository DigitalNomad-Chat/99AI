export interface UnifiedBotMessage {
  platformUserId: string;
  content: string;
  msgType: 'text' | 'image' | 'file' | 'event';
  platformMsgId: string;
  rawData: any;
}

export interface UnifiedBotReply {
  content: string;
  msgType: 'text' | 'image' | 'markdown';
  platformUserId: string;
}
