/**
 * 构建 Page.onShareAppMessage / onShareTimeline / onAddToFavorites 返回值。
 * 配合各页 wx.showShareMenu 使用，依赖微信右上角原生分享菜单，无需页面内分享按钮。
 */
var shareConfig = require('../share-config.js');

function pickImageUrl() {
  var url = shareConfig.imageUrl;
  return url && String(url).trim() ? String(url).trim() : '';
}

/**
 * @param {{ page?: 'chat' | 'voice' }} [options]
 * @returns {WechatMiniprogram.Page.ICustomShareContent}
 */
function buildShareAppMessage(options) {
  options = options || {};
  var cfg = shareConfig.appMessage || {};
  var path = cfg.path || '/pages/chat/chat';
  // 语音通话页分享：好友打开后进入聊天首页，避免直接进入通话流程
  if (options.page === 'voice') {
    path = cfg.path || '/pages/chat/chat';
  }
  var payload = {
    title: cfg.title || 'Novi',
    path: path,
  };
  var imageUrl = pickImageUrl();
  if (imageUrl) {
    payload.imageUrl = imageUrl;
  }
  return payload;
}

/**
 * @returns {WechatMiniprogram.Page.ICustomTimelineContent}
 */
function buildShareTimeline() {
  var cfg = shareConfig.timeline || {};
  var payload = {
    title: cfg.title || shareConfig.appMessage.title || 'Novi',
    query: cfg.query != null ? String(cfg.query) : '',
  };
  var imageUrl = pickImageUrl();
  if (imageUrl) {
    payload.imageUrl = imageUrl;
  }
  return payload;
}

/**
 * @returns {WechatMiniprogram.Page.IAddToFavoritesContent}
 */
function buildAddToFavorites() {
  var cfg = shareConfig.favorites || {};
  var appCfg = shareConfig.appMessage || {};
  var payload = {
    title: cfg.title || appCfg.title || 'Novi',
    query: cfg.query != null ? String(cfg.query) : '',
  };
  var imageUrl = pickImageUrl();
  if (imageUrl) {
    payload.imageUrl = imageUrl;
  }
  return payload;
}

module.exports = {
  buildShareAppMessage: buildShareAppMessage,
  buildShareTimeline: buildShareTimeline,
  buildAddToFavorites: buildAddToFavorites,
};
