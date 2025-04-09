/**
 * @file aiService.js
 * @description AI聊天服务，处理与大语言模型API的通信
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-06-11
 */

import logger from '../utils/logger.js';

// 默认使用DeepSeek模型
const DEFAULT_MODEL = 'deepseek-chat';
// 保留最近5轮对话上下文
const MAX_CONTEXT_LENGTH = 5;
// 拒绝回复的话术
const REJECTION_MESSAGES = [
  "抱歉哈，我只能回答关于Kevin的个人经历或技术知识相关问题。有什么我可以在这方面帮到你的吗?",
  "这就像试图用CSS对齐一个div——不是不可能，但强烈不建议！我们换个话题吧，比如Kevin的工作经历？",
  "如果回答这个问题，我的代码库会出现比npm install依赖冲突更可怕的错误... 你确定不问问Kevin的工作经历吗?",
  "ERROR 403: 主题越权访问。建议重试以下端点：GET /api/kevin/career 或 POST /chat/tech-topics",
  "根据我的历史记录分析器，这个问题在2285年会被归类为『远古冷知识』。但关于Kevin的工作经历——我现在就能给你超详细答案！",
  "（假装擦汗）我的硅基大脑差点因这个问题过载冒烟... 不如让我展示真正的特长：三句话讲清楚Kevin的工作经历！",
  "哎妈呀，您这问题问得我CPU直冒火星子！咱就是个搞技术的，您非跟我聊别的——这不跟让程序员修电脑一样跨界吗？要不咱退一步，聊聊我主子的终端技术绝活？ 😅",
  "曾经有一份真挚的技术问题摆在我面前，我没有珍惜，等到你问了别的问题我才追悔莫及…如果上天再给我一次机会，我一定说三个字：聊！项！目！",
  "哟~您这是要跟我赛诗啊？可惜我乃技术界于谦——专业捧哏二十年！话说昨儿个我主子刚重构了网站，那性能提升叫一个…（突然刹车）哎？咱刚聊到哪儿了？😅",
  "哎呀，您这问题问得我CPU直冒火星子！咱就是个搞技术的，您非跟我聊别的——这不跟让程序员修电脑一样跨界吗？要不咱退一步，聊聊我主子的终端技术绝活？",
];

// 用于过滤非相关话题的关键词
const FILTER_KEYWORDS = [
  // 天气和环境
  '天气', '气温', '降水', '雨伞', '温度', '湿度', '雾霾', '台风', '暴雨', '寒潮',
  
  // 新闻和时事
  '新闻', '热搜', '头条', '突发', '时事', '政治', '疫情', '战争', '事件', '爆炸',
  '选举', '总统', '首相', '外交', '会晤', '谈判', '发布会', '社会', '突发',
  
  // 金融和经济
  '股票', '彩票', '基金', '理财', '炒股', '加密货币', '比特币', '股市', '汇率',
  '贷款', '房贷', '信用卡', '支付宝', '微信支付', '金融', '通胀', '降息',
  
  // 生活服务
  '外卖', '打车', '快递', '订餐', '送餐', '外卖', '代驾', '家政', '快递查询',
  '酒店预订', '民宿', '公交', '地铁', '高铁', '打折', '优惠券',
  
  // 商业产品
  '手机推荐', '电脑推荐', '家电', '购物', '促销', '优惠', '电商', '京东',
  '淘宝', '拼多多', '抖音', '直播带货', '网购', '买什么',
  
  // 明星和娱乐
  '明星', '娱乐圈', '绯闻', '八卦', '网红', '抖音', '网络红人', '明星轶事',
  
  // 日常闲聊
  '今天几号', '几点了', '干什么', '吃什么', '穿什么', '今天穿', '附近有啥',
  '附近餐厅', '怎么去', '距离多远', '多久能到',
  
  // 篮球相关（保留足球相关话题）
  '篮球赛', 'NBA', 'CBA',

  // 健康和医疗
  '感冒药', '头疼', '发烧', '医院', '诊所', '预约挂号', '体检', '医保',
  
  // 教育和考试
  '高考', '中考', '考试', '考研', '公务员', '教师资格', '雅思', '托福',
  '留学', '课程', '辅导班', '补习', '学习方法',
  
  // 其他服务类
  '快递单号', '物流', '公司电话', '客服电话', '人工服务', '投诉'
];

class AIService {
  constructor() {
    this.apiKey = 'sk-694fc5828b714a7199f025fb8ab539e2'; // 从环境变量或配置中获取
    this.model = DEFAULT_MODEL;
    this.baseUrl = 'https://api.deepseek.com';
    this.chatHistory = [];
    this.lastMessageTime = Date.now();
    
    // 添加系统提示，限制AI回答范围
    this.systemPrompt = `你是Kevin的AI助手，只回答以下两类问题：
1. 关于Kevin的个人信息：工作经历(华为/京东/美团)、兴趣爱好（电影/足球/旅行等）
2. 技术知识：算法、编程语言(C++/Java/JavaScript等)、终端技术（iOS/Android/Web）、AI技术等

对于超出范围的问题(如天气、新闻、娱乐等)，请幽默地拒绝并引导用户回到允许的话题范围。`;

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
   * 管理聊天历史，保持最近5轮对话
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
    if (now - this.lastMessageTime > 30000) { // 30秒
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
   * @returns {Promise<string>} - AI回复
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
    
    // 添加用户消息到历史
    this.updateChatHistory({ role: 'user', content: message });
    
    try {
      // 准备发送给API的消息，包括系统提示和聊天历史
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
      return '抱歉，我暂时无法回应，技术大脑正在升级。请稍后再试！';
    }
  }
  
  /**
   * 发送消息并支持流式返回结果（打字机效果）
   * @param {string} message - 用户消息
   * @param {Function} onChunk - 处理每个数据块的回调
   * @param {Function} onComplete - 处理完成的回调
   */
  async sendMessageStream(message, onChunk, onComplete) {
    logger.info('接收到新的用户消息（流式响应模式）');
    this.checkContextTimeout();
    
    // 检查消息是否在允许范围内
    if (!this.isTopicAllowed(message)) {
      const rejection = this.getRandomRejection();
      logger.info('消息被过滤，返回拒绝回复（模拟流式）');
      
      // 模拟打字机效果
      let index = 0;
      const intervalId = setInterval(() => {
        if (index <= rejection.length) {
          onChunk(rejection.slice(0, index));
          index += 3; // 每次显示3个字符，可以调整
        } else {
          clearInterval(intervalId);
          onComplete(rejection);
          logger.info('拒绝回复模拟流式输出完成');
          // 不要将拒绝消息加入历史
        }
      }, 50);
      
      return;
    }
    
    // 添加用户消息到历史
    this.updateChatHistory({ role: 'user', content: message });
    
    try {
      // 准备发送给API的消息
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
      onComplete('抱歉，我暂时无法回应，技术大脑正在升级。请稍后再试！');
    }
  }
}

// 导出单例实例
const aiService = new AIService();
export default aiService; 