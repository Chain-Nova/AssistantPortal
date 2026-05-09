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
    /** 顶栏右侧内边距(px)，避开胶囊，避免与「新对话」重叠 */
    headerPaddingRightPx: 96,
    keyboardHeightPx: 0,
    /** 列表底部留白(px)：底栏高度 + 键盘高度，避免最后几条消息被挡住 */
    listPaddingBottomPx: 120,
    recommendedQuestions: welcomeConfig.recommendedQuestions,
    welcomeTitle: welcomeConfig.welcomeTitle,
    welcomeSubtitle: welcomeConfig.welcomeSubtitle,
  },

  _abortFn: null,
  _baseListPadding: 120,
  _onKeyboardHeightChange: null,

  onLoad: function () {
    var statusBarHeight = 24;
    var headerPaddingRightPx = 96;
    var baseListPadding = 120;
    try {
      var sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      statusBarHeight = sys.statusBarHeight || 24;
      var ww = sys.windowWidth || sys.screenWidth;
      var menu = wx.getMenuButtonBoundingClientRect
        ? wx.getMenuButtonBoundingClientRect()
        : null;
      if (menu && typeof menu.left === 'number' && ww) {
        // 胶囊左缘以右为系统保留区，整体右内边距 = 该区宽度 + 少量间隙
        headerPaddingRightPx = Math.ceil(ww - menu.left) + 4;
      }
      var rpxRatio = ww / 750;
      // 底栏约 16+16rpx padding + 输入条 ~112rpx，再加一点余量
      baseListPadding = Math.ceil(rpxRatio * 180);
      if (sys.safeAreaInsets && sys.safeAreaInsets.bottom) {
        baseListPadding += sys.safeAreaInsets.bottom;
      }
    } catch (e) {
      statusBarHeight = 24;
    }
    this._baseListPadding = baseListPadding;
    this.setData({
      statusBarHeight: statusBarHeight,
      headerPaddingRightPx: headerPaddingRightPx,
      listPaddingBottomPx: baseListPadding,
    });

    var self = this;
    this._onKeyboardHeightChange = function (res) {
      var h = res && res.height ? res.height : 0;
      self.setData({
        keyboardHeightPx: h,
        listPaddingBottomPx: self._baseListPadding + h,
      });
    };
    if (wx.onKeyboardHeightChange) {
      wx.onKeyboardHeightChange(this._onKeyboardHeightChange);
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
    if (
      this._onKeyboardHeightChange &&
      wx.offKeyboardHeightChange
    ) {
      wx.offKeyboardHeightChange(this._onKeyboardHeightChange);
      this._onKeyboardHeightChange = null;
    }
  },

  _hideKeyboard: function () {
    try {
      if (wx.hideKeyboard) {
        wx.hideKeyboard({ fail: function () {} });
      }
    } catch (e) {}
  },

  /** 点击消息区、顶栏空白等区域收起键盘 */
  onTapBlankHideKeyboard: function () {
    this._hideKeyboard();
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
    this._hideKeyboard();
    if (wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
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

  /** 清空会话并生成新的 conversation_id，与后端新线程对齐 */
  startNewChat: function () {
    this._hideKeyboard();
    if (this._abortFn) {
      this._abortFn();
      this._abortFn = null;
    }
    app.globalData.messages = [];
    app.globalData.pendingVoiceMessages = [];
    app.globalData.conversationId = 'c-' + generateUUID();
    this.setData({ input: '', sending: false });
    this._syncMessages();
  },

  openVoice: function () {
    this._hideKeyboard();
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
