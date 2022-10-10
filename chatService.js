import { CometChat } from '@cometchat-pro/chat';

const chatService = {
  initialized: false,
  appID: process.env.MIX_COMETCHAT_APP_ID,
  region: process.env.MIX_COMETCHAT_REGION,
  messagesListenerId: Math.random() * 1000,
  limit: 30,
  user: {},
  selectedChat: '', //uid of selected user
  conversationsBuilder: {},
  conversations: [],
  messagesBuilder: {},
  messagesBuilderUid: null,
  activeConversationId: null,
  onConversationMesaage: null,
  messages: [],
  //listener callbacks
  onConversationsUpdate: null,

  init: async function (token) {
    const appSetting = new CometChat.AppSettingsBuilder().subscribePresenceForAllUsers().setRegion(this.region).build();
    //init cometchat
    return await CometChat.init(this.appID, appSetting).then(
      resp => {
        //login after init
        return this.login(token);
      },
      error => {
        console.log('Initialization failed with error:', error);
        // Check the reason for error and take appropriate action.
        return false;
      }
    );
  },
  login: async function (token) {
    return await CometChat.login(token).then(
      user => {
        this.user = user;
        this.initialized = true;
        return true;
      },
      error => {
        console.log('Login failed with exception:', { error });
        return false;
      }
    );
  },
  logout: async function () {
    console.log('logout chat');
    this.initialized = false;
    this.user = {};
    return await CometChat.logout();
  },
  loadConversationsAndSubscribe: async function (callback) {
    this.onConversationsUpdate = callback;
    //build conversationsBuilder to fetch conversations
    this.conversationsBuilder = new CometChat.ConversationsRequestBuilder()
      .setLimit(this.limit)
      .setConversationType('user')
      .build();
    return await this.loadConversations();
  },
  subscribeToMessages: function (callback = null) {
    // Listen to new live messages
    CometChat.addMessageListener(
      this.messagesListenerId,
      new CometChat.MessageListener({
        onTextMessageReceived: textMessage => {
          callback && callback(textMessage);
          this.handleMessageReceived(textMessage);
        },
        onMediaMessageReceived: mediaMessage => {
          callback && callback(mediaMessage);
          this.handleMessageReceived(mediaMessage);
        },
      })
    );
  },
  subscribeToConversationMessages: function (conversationId, callback) {
    console.log('subscribeToConversationMessages ', conversationId);
    this.activeConversationId = conversationId;
    this.onConversationMesaage = callback;
  },

  sendTextMessage: async function (uid, text) {
    // Build message object
    const textMessage = new CometChat.TextMessage(String(uid), text, CometChat.RECEIVER_TYPE.USER);

    // Send message
    return await CometChat.sendMessage(textMessage).then(
      async message => {
        console.log('Message sent successfully:', message);
        const conversation = await this.updateConversationsList(message);
        if (this.messagesBuilderUid === String(message.receiverId)) {
          this.messages = [...this.messages, message];
          this.onConversationMesaage && this.onConversationMesaage(this.messages);
        }
        return { message, conversation };
      },
      error => {
        console.log('Message sending failed with error:', error);
        return false;
        // Handle any error
      }
    );
  },
  sendImageMessage: async function (uid, file) {
    // Build message object
    const textMessage = new CometChat.MediaMessage(
      String(uid),
      file,
      CometChat.MESSAGE_TYPE.IMAGE,
      CometChat.RECEIVER_TYPE.USER
    );

    // Send message
    return await CometChat.sendMediaMessage(textMessage).then(
      message => {
        console.log('Message sent successfully:', message);
        this.updateConversationsList(message);
        if (this.messagesBuilderUid === String(message.receiverId)) {
          this.messages = [...this.messages, message];
          this.onConversationMesaage && this.onConversationMesaage(this.messages);
        }
        return message;
      },
      error => {
        console.log('Message sending failed with error:', error);
        return false;
        // Handle any error
      }
    );
  },

  handleMessageReceived: async function (message) {
    console.log('handleMessageReceived', message, this.messagesBuilderUid, this.activeConversationId);
    if (this.messagesBuilderUid === String(message.sender.uid)) {
      this.markAsRead(message.id, message.sender.uid);
      this.messages = [...this.messages, message];
      this.onConversationMesaage && this.onConversationMesaage(this.messages);
    }
    this.updateConversationsList(message);
  },
  loadConversations: async function () {
    return await this.conversationsBuilder.fetchNext().then(
      conversationList => {
        console.log('Conversations list received:', conversationList);
        this.conversations = [...this.conversations, ...conversationList];
        this.onConversationsUpdate(this.conversations);
        return conversationList;
      },
      error => {
        console.log('Conversations list fetching failed with error:', error);
        return false;
      }
    );
  },
  getConversationWithUid: async function (uid) {
    return await CometChat.getConversation(String(uid), 'user').then(
      conversation => {
        console.log('conversation with uid', conversation);
        return conversation;
      },
      error => {
        console.log('error while fetching a conversation', error);
        return false;
      }
    );
  },
  getConversationMessages: async function (uid) {
    if (uid !== this.messagesBuilderUid) {
      this.messagesBuilderUid = uid;
      this.messages = [];
      this.messagesBuilder = new CometChat.MessagesRequestBuilder().setUID(String(uid)).setLimit(this.limit).build();
    }
    console.log('messagesBuilder', this.messagesBuilder);
    return await this.messagesBuilder.fetchPrevious().then(
      messages => {
        console.log('Message list fetched:', messages);
        this.messages = [...messages, ...this.messages]; //update  for recieved messages handling
        return messages;
        // Handle the list of messages
      },
      error => {
        console.log('Message fetching failed with error:', error);
      }
    );
  },
  markAsRead: function (messageId, uid) {
    console.log('markAsRead', messageId, uid);
    CometChat.markAsRead(messageId, String(uid), 'user');
  },
  updateConversationUnreadCount(conversation, count = 0) {
    this.conversations.find(el => el.conversationId === conversation.conversationId).unreadMessageCount = count;
    this.onConversationsUpdate([...this.conversations]);
  },
  updateConversationsList: async function (msg) {
    //find in conversations
    if (!this.onConversationsUpdate) {
      return false;
    }
    let conversationIndex = this.conversations.findIndex(el => el.conversationId === msg.conversationId);
    if (conversationIndex >= 0) {
      //remove index and plase it first
      this.conversations[conversationIndex].lastMessage = msg;
      //increase unread count if it's not selected conversation
      if (this.activeConversationId != this.conversations[conversationIndex].conversationId) {
        this.conversations[conversationIndex].unreadMessageCount += 1;
      }
      let tmp = this.conversations.splice(conversationIndex, 1);
      this.conversations.unshift(...tmp);
      this.onConversationsUpdate([...this.conversations]);
      return tmp[0];
    } else {
      return await CometChat.CometChatHelper.getConversationFromMessage(msg).then(
        resp => {
          console.log('Conversation Object from message', resp);
          this.conversations.unshift(resp);
          this.onConversationsUpdate([...this.conversations]);
          return resp;
        },
        error => {
          console.log('Error while converting message object', error);
        }
      );
    }
  },
  resetActiveConversationSubscriptions: function () {
    this.activeConversationId = null;
    this.onConversationMesaage = null;
    this.messagesBuilderUid = null;
    this.messagesBuilder = {};
    this.messages = [];
  },
  resetConversationsSubscriptions: function () {
    this.conversationsBuilder = {};
    this.onConversationsUpdate = null;
    this.conversations = [];
  },
  getUnreadMessageCount: async function () {
    return await CometChat.getUnreadMessageCountForAllUsers(true).then(
      array => {
        return array;
      },
      error => {
        console.log('Error in getting message count', error);
      }
    );
  },
  findConversationById: function (conversationId) {
    return this.conversations.find(conversation => conversation.conversationId === conversationId);
  },
};
export default chatService;
