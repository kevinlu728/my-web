/**
 * @file aiConfig.js
 * @description AI服务相关配置
 * @author 陆凯
 * @version 1.0.0
 * @created 2024-06-11
 * 
 * 该模块提供AI服务相关的配置参数：
 * - 模型设置
 * - 系统提示
 * - 安全过滤设置
 * - 拒绝回复话术
 * 
 * 提供了默认配置，可被环境特定配置覆盖。
 */

// 默认AI配置
export default {
  // 模型基本设置
  model: {
    default: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    timeout: 30000, // 请求超时时间，毫秒
    maxRetries: 2,  // 最大重试次数
  },
  
  // 对话管理设置
  conversation: {
    maxContextLength: 5,     // 保留最近的对话轮数
    contextTimeout: 30000,   // 上下文超时时间，毫秒
    streamChunkSize: 3,      // 模拟流式输出时每次显示的字符数
    streamChunkDelay: 50,    // 模拟流式输出的延迟，毫秒
  },
  
  // 系统提示内容
  systemPrompt: `你是Kevin的AI助手，只回答以下两类问题：
1. 关于Kevin的个人信息：工作经历(华为/京东/美团)、兴趣爱好（电影/足球/旅行等）
2. 技术知识：算法、编程语言(C++/Java/JavaScript等)、终端技术（iOS/Android/Web）、AI技术等

对于超出范围的问题(如天气、新闻、娱乐等)，请幽默地拒绝并引导用户回到允许的话题范围。`,
  
  // 拒绝回复话术
  rejectionMessages: [
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
  ],
  
  // 用于过滤非相关话题的关键词
  filterKeywords: [
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
  ],
  
  // 欢迎消息
  welcomeMessages: [
    '你好！我是Kevin的AI助手小鹿，很高兴为你服务 👋',
    '我可以帮您：\n1. 了解Kevin的工作经历\n2. 了解Kevin的兴趣爱好\n3. 获取技术知识\n请问您想了解什么？ 😊'
  ],
  
  // API错误响应
  errorResponse: '抱歉，我暂时无法回应，技术大脑正在升级。请稍后再试！'
}; 