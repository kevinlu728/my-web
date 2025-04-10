/**
 * @file aiService.js
 * @description AI聊天服务，处理与大语言模型API的通信
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-06-11
 */

import logger from '../utils/logger.js';
import configManager from '../config/config.js';

// 从配置中获取常量
const DEFAULT_MODEL = configManager.ai.model.default;
const MAX_CONTEXT_LENGTH = configManager.ai.conversation.maxContextLength;
const REJECTION_MESSAGES = configManager.ai.rejectionMessages;
const FILTER_KEYWORDS = configManager.ai.filterKeywords;

class AIService {
  constructor() {
    // 从配置获取API密钥和基础URL
    this.apiKey = configManager.getAIApiKey();
    this.model = DEFAULT_MODEL;
    this.baseUrl = configManager.ai.model.baseUrl;
    this.chatHistory = [];
    this.lastMessageTime = Date.now();
    
    // 从配置获取系统提示
    this.systemPrompt = configManager.getAISystemPrompt();

    logger.info('AI服务初始化完成，使用模型：' + this.model);
  }

  /**
   * 判断用户问题是否在允许范围内
   * @param {string} message - 用户消息
   * @returns {boolean} - 是否允许回答
   */
  isTopicAllowed(message) {
    // 简单的关键词过滤，实际可能需要更复杂的分类算法
    for (const keyword of FILTER_KEYWORDS) {
      if (message.toLowerCase().includes(keyword)) {
        logger.info('检测到非允许话题，关键词匹配');
        return false;
      }
    }
    return true;
  }

  /**
   * 获取随机的拒绝回复
   * @returns {string} - 拒绝回复
   */
  getRandomRejection() {
    const index = Math.floor(Math.random() * REJECTION_MESSAGES.length);
    logger.info('返回拒绝回复，使用模板索引：' + index);
    return REJECTION_MESSAGES[index];
  }

  /**
   * 管理聊天历史，保持最近N轮对话
   * @param {Object} message - 新消息
   */
  updateChatHistory(message) {
    this.chatHistory.push(message);
    
    // 只保留最近的对话
    if (this.chatHistory.length > MAX_CONTEXT_LENGTH * 2) { // 乘以2因为每轮有用户和AI两条消息
      logger.info('聊天历史超过限制长度，进行裁剪');
      this.chatHistory = this.chatHistory.slice(-MAX_CONTEXT_LENGTH * 2);
    }
    
    // 更新最后一次消息时间
    this.lastMessageTime = Date.now();
    logger.info('聊天历史更新，当前对话轮数：' + (this.chatHistory.length / 2).toFixed(0));
  }

  /**
   * 检查是否需要重置上下文（30秒无新消息）
   */
  checkContextTimeout() {
    const now = Date.now();
    const timeout = configManager.ai.conversation.contextTimeout || 30000; // 默认30秒
    if (now - this.lastMessageTime > timeout) {
      logger.info('聊天上下文超时，重置聊天历史');
      this.clearChatHistory();
    }
  }

  /**
   * 清空聊天历史
   */
  clearChatHistory() {
    this.chatHistory = [];
    logger.info('聊天历史已清空');
  }

  /**
   * 发送消息到AI服务并获取回复
   * @param {string} message - 用户消息
   * @returns {Promise<string>} - AI的回复
   */
  async sendMessage(message) {
    logger.info('接收到新的用户消息');
    this.checkContextTimeout();
    
    // 检查消息是否在允许范围内
    if (!this.isTopicAllowed(message)) {
      const rejection = this.getRandomRejection();
      logger.info('消息被过滤，返回拒绝回复');
      return Promise.resolve(rejection);
    }
    
    try {
      // 将用户消息添加到历史
      this.updateChatHistory({ role: 'user', content: message });
      
      // 构建发送到API的消息，包括系统提示和聊天历史
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.chatHistory
      ];
      
      logger.info('开始调用DeepSeek API，消息数量：' + messages.length);
      
      // 调用DeepSeek API
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          stream: false
        })
      });
      
      if (!response.ok) {
        const statusText = response.statusText;
        const status = response.status;
        logger.error(`API请求失败: ${status} ${statusText}`);
        throw new Error(`API请求失败: ${status}`);
      }
      
      logger.info('API请求成功，正在解析响应');
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      logger.info('获取到AI回复，字符长度：' + aiResponse.length);
      
      // 添加AI回复到历史
      this.updateChatHistory({ role: 'assistant', content: aiResponse });
      
      return aiResponse;
    } catch (error) {
      logger.error('AI服务错误:', error);
      return configManager.ai.errorResponse || '抱歉，我暂时无法回应，技术大脑正在升级。请稍后再试！';
    }
  }

  /**
   * 以流式方式发送消息到AI服务，获取回复
   * @param {string} message - 用户消息
   * @param {function} onChunk - 收到数据块的回调
   * @param {function} onComplete - 完成时的回调
   */
  async sendMessageStream(message, onChunk, onComplete) {
    logger.info('接收到新的用户消息（流式响应模式）');
    this.checkContextTimeout();
    
    // 检查消息是否在允许范围内
    if (!this.isTopicAllowed(message)) {
      const rejection = this.getRandomRejection();
      // 模拟流式效果
      this.simulateStream(rejection, onChunk, onComplete);
      return;
    }
    
    try {
      // 将用户消息添加到历史
      this.updateChatHistory({ role: 'user', content: message });
      
      // 构建发送到API的消息
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...this.chatHistory
      ];
      
      logger.info('开始调用DeepSeek流式API，消息数量：' + messages.length);
      
      // 调用DeepSeek API的流式接口
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          stream: true
        })
      });
      
      if (!response.ok) {
        const statusText = response.statusText;
        const status = response.status;
        logger.error(`流式API请求失败: ${status} ${statusText}`);
        throw new Error(`API请求失败: ${status}`);
      }
      
      logger.info('流式API连接建立成功，开始接收数据');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let chunkCount = 0;
      
      // 处理流式响应
      const readChunk = async () => {
        const { done, value } = await reader.read();
        
        if (done) {
          logger.info(`流式响应完成，共接收${chunkCount}个数据块`);
          onComplete(fullResponse);
          // 将完整回复添加到历史
          this.updateChatHistory({ role: 'assistant', content: fullResponse });
          return;
        }
        
        // 解析数据块
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        let newContentReceived = false;
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.choices && data.choices[0].delta.content) {
                const content = data.choices[0].delta.content;
                fullResponse += content;
                onChunk(fullResponse);
                newContentReceived = true;
                chunkCount++;
              }
            } catch (e) {
              logger.error('解析流数据错误:', e);
            }
          }
        }
        
        // 继续读取下一个数据块
        readChunk();
      };
      
      readChunk();
    } catch (error) {
      logger.error('AI流式服务错误:', error);
      onComplete(configManager.ai.errorResponse || '抱歉，我暂时无法回应，技术大脑正在升级。请稍后再试！');
    }
  }
  
  /**
   * 模拟流式响应（用于拒绝回复或API不可用时）
   * @param {string} text - 完整文本
   * @param {function} onChunk - 收到数据块的回调
   * @param {function} onComplete - 完成时的回调
   */
  simulateStream(text, onChunk, onComplete) {
    let displayedText = '';
    const chunkSize = configManager.ai.conversation.streamChunkSize || 3;
    const chunkDelay = configManager.ai.conversation.streamChunkDelay || 50;
    
    const sendNextChunk = (index) => {
      if (index >= text.length) {
        onComplete(displayedText);
        return;
      }
      
      const endIndex = Math.min(index + chunkSize, text.length);
      displayedText = text.substring(0, endIndex);
      onChunk(displayedText);
      
      setTimeout(() => sendNextChunk(endIndex), chunkDelay);
    };
    
    // 开始模拟流式输出
    sendNextChunk(0);
  }
}

// 导出单例实例
const aiService = new AIService();
export default aiService; 