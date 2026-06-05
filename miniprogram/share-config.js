/**
 * 小程序原生分享（右上角菜单「转发」「分享到朋友圈」）文案与路径配置。
 * 可选：将 500×400 左右的 share-cover.png 放入 assets/ 后取消下行注释。
 */
module.exports = {
  /** 转发给好友 / 群聊 */
  appMessage: {
    title: 'Novi · 连接智能 AI 助手',
    path: '/pages/chat/chat',
  },
  /** 分享到朋友圈（仅聊天页开启） */
  timeline: {
    title: 'Novi · 连接智能 AI 助手 — 文字与实时语音对话',
    query: '',
  },
  /** 收藏 */
  favorites: {
    title: 'Novi',
    query: '',
  },
  // imageUrl: '/assets/share-cover.png',
};
