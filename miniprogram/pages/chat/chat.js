/**
 * 聊天页面 - 移植自 front/src/pages/ChatPage.tsx
 * 文字聊天 + SSE 流式回复 + 消息展示 + 导航到语音页
 */
var { streamTextQuery } = require('../../utils/text-sse');
var { generateUUID } = require('../../utils/uuid');
var welcomeConfig = require('../../welcome-config.js');
var app = getApp();

Page({
  data: {
    messages: [],
    input: '',
    sending: false,
    showWelcome: true,
    scrollTarget: '',
    statusBarHeight: 24,
    recommendedQuestions: welcomeConfig.recommendedQuestions,
    welcomeTitle: welcomeConfig.welcomeTitle,
    welcomeSubtitle: welcomeConfig.welcomeSubtitle,
  },

  _abortFn: null,

  onLoad: function () {
    try {
      var sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.setData({ statusBarHeight: sys.statusBarHeight || 24 });
    } catch (e) {
      this.setData({ statusBarHeight: 24 });
    }
    this._syncMessages();
  },

  onShow: function () {
    app.mergeVoiceMessages();
    this._syncMessages();
  },

  onUnload: function () {
    if (this._abortFn) {
      this._abortFn();
      this._abortFn = null;
    }
  },

  _syncMessages: function () {
    var msgs = app.globalData.messages;
    this.setData({
      messages: msgs,
      showWelcome: msgs.length === 0,
      scrollTarget:
        msgs.length > 0 ? 'msg-' + msgs[msgs.length - 1].id : '',
    });
  },

  onInputChange: function (e) {
    this.setData({ input: e.detail.value });
  },

  sendText: function () {
    var text = (this.data.input || '').trim();
    if (!text || this.data.sending) return;
    this.setData({ input: '' });
    this._sendMessage(text);
  },

  /** 点击推荐问题卡片，直接发起对话 */
  onRecommendTap: function (e) {
    var text = (e.currentTarget.dataset.text || '').trim();
    if (!text || this.data.sending) return;
    this._sendMessage(text);
  },

  /**
   * @param {string} text 已 trim 的用户文案
   */
  _sendMessage: function (text) {
    if (!text || this.data.sending) return;

    this.setData({ sending: true });

    var userId = generateUUID();
    var asstId = generateUUID();

    app.addMessage({ id: userId, role: 'user', content: text });
    app.addMessage({
      id: asstId,
      role: 'assistant',
      content: '',
      streaming: true,
    });
    this._syncMessages();

    var lastSnapshot = '';
    var self = this;

    var innerAbort = streamTextQuery(
      text,
      app.globalData.conversationId,
      function (content) {
        var delta =
          lastSnapshot && content.indexOf(lastSnapshot) === 0
            ? content.slice(lastSnapshot.length)
            : content;
        if (!delta) return;
        lastSnapshot = content;

        var cur = app.globalData.messages.find(function (m) {
          return m.id === asstId;
        });
        var prevContent = cur ? cur.content : '';
        app.updateMessage(asstId, {
          content: prevContent + delta,
        });
        self._syncMessages();
      },
      {
        onComplete: function (detail) {
          self._abortFn = null;

          var msg = app.globalData.messages.find(function (m) {
            return m.id === asstId;
          });
          if (!msg || !msg.streaming) {
            self.setData({ sending: false });
            return;
          }

          if (detail.cancelled) {
            app.updateMessage(asstId, { streaming: false });
            self.setData({ sending: false });
            self._syncMessages();
            return;
          }

          if (detail.ok) {
            app.updateMessage(asstId, { streaming: false });
            self.setData({ sending: false });
            self._syncMessages();
            return;
          }

          var c = msg.content || '';
          app.updateMessage(asstId, {
            content: c.trim() ? c : '网络异常，请稍后重试',
            streaming: false,
          });
          self.setData({ sending: false });
          self._syncMessages();
        },
      }
    );

    this._abortFn = innerAbort;
  },

  copyMessage: function (e) {
    var content = e.currentTarget.dataset.content;
    if (content) {
      wx.setClipboardData({
        data: content,
        success: function () {
          wx.showToast({ title: '已复制', icon: 'success', duration: 1000 });
        },
      });
    }
  },

  openVoice: function () {
    wx.authorize({
      scope: 'scope.record',
      success: function () {
        wx.navigateTo({ url: '/pages/voice/voice' });
      },
      fail: function () {
        wx.showModal({
          title: '提示',
          content: '需要麦克风权限才能使用语音功能，请在设置中开启',
          confirmText: '去设置',
          success: function (res) {
            if (res.confirm) {
              wx.openSetting();
            }
          },
        });
      },
    });
  },
});
