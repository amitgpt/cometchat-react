import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Form, FormControl } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { SearchIcon, XIcon } from '../../components/Icons';
import Loader from '../../components/Loader';
import Message from './Message';
import { selectAuthUser, selectChatToken } from '../../reducers/auth/auth.selectors';
import chatService from '../../chatService';
import AsyncSelect from 'react-select/async';
import API from '../../API';
import Conversations from './Conversations';
import UploadIcon from '../../images/Group 3836.png';
import option from '../../images/options.png';
import backIcon from '../../images/ic_back.png';
import { USER_PROFILE } from '../../constants/routes';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {setChatUnreadCountActionCreator} from '../../reducers/notifications/notifications.actionCreators';
const Messages = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const scrollBottomRef = useRef(null);
  const [searchRecipient, setSearchRecipient] = useState('');
  const [search, setSearch] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatMessages, setActiveChatMessages] = useState([]);
  const [showHideDiv, setShowHideDiv] = useState(true);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [text, setText] = useState('');
  const [sendButtonDisable, setSendButtonDisable] = useState(false);
  const chatToken = useSelector(selectChatToken);
  const isScrollAtTop = node => {
    return node.scrollTop < 150;
  };
  const isScrollAtBottom = node => {
    return node.scrollHeight - (node.scrollTop + node.clientHeight) < 150;
  };
  const scrollToBottom = () => {
    scrollBottomRef.current.scrollTop = scrollBottomRef.current.scrollHeight;
  };
  useEffect(() => {
    if (chatToken && chatService.initialized) {
      loadConversationsAndSubscribe();
      chatService.subscribeToMessages();
    }
    return () => {
      chatService.resetConversationsSubscriptions();
      chatService.resetActiveConversationSubscriptions();
    };
  }, [chatToken]);
  const loadConversationsAndSubscribe = () => {
    chatService.resetConversationsSubscriptions();
    chatService.loadConversationsAndSubscribe(onConversationsUpdate).then(conversations => {
      if (conversations.length === chatService.limit) {
        setHasMoreConversations(true);
      }
    });
  };
  const onConversationsUpdate = useCallback(conversationsUpdate => {
    setConversations(conversationsUpdate);
    setIsLoadingConversations(false);
    let isUnreadCount = conversationsUpdate.findIndex(obj => obj.unreadMessageCount > 0);
    
    if(isUnreadCount > -1){
      dispatch(setChatUnreadCountActionCreator(1));
    }else{
      dispatch(setChatUnreadCountActionCreator(0));
      
    }

  }, []);
  const handleConversationNewMessage = useCallback(messages => {
    
    setActiveChatMessages(messages);
    scrollToBottom();
  }, []);
  const loadMoreConversations = () => {
    setIsLoadingConversations(true);
    chatService.loadConversations().then(conversations => {
      if (conversations.length < chatService.limit) {
        setHasMoreConversations(false);
      }
      setIsLoadingConversations(false);
    });
  };
  const loadMoreMessages = () => {
    setIsLoadingMessages(true);
    chatService.getConversationMessages(activeChat.uid).then(messages => {
      if (messages.length < chatService.limit) {
        setHasMoreMessages(false);
      }
      setActiveChatMessages([...messages, ...activeChatMessages]);
      setIsLoadingMessages(false);
    });
  };
  const selectConversationFromList = conversation => {
    setShowHideDiv(false)
    if (window.innerWidth < 768) {
      document.getElementById('mobile-menu-footer').classList.add('d-none')
      document.getElementById('childrenDiv').classList.add('mb-0');
      document.getElementById('inbox-page').classList.remove('messages-cont-inbox');
    }
    const uid = conversation.conversationWith.uid;
    if (!activeChat || activeChat === 'new' || activeChat === 'empty' || activeChat.uid !== uid) {
      setActiveChat({
        uid: uid,
        name: conversation.conversationWith.name,
        nickname:
          conversation.conversationWith.metadata && conversation.conversationWith.metadata.nickname
            ? conversation.conversationWith.metadata.nickname
            : null,
      });
      setIsLoadingMessages(true);
      setActiveChatMessages([]);
      chatService.getConversationMessages(uid).then(messages => {
        setActiveChatMessages(messages);
        if (messages.length === chatService.limit) {
          setHasMoreMessages(true);
        } else {
          setHasMoreMessages(false);
        }
        if (!!messages.length && conversation.unreadMessageCount > 0) {
          chatService.markAsRead(messages[messages.length - 1].id, uid);
          chatService.updateConversationUnreadCount(conversation, 0);
        }
        setIsLoadingMessages(false);
        chatService.subscribeToConversationMessages(conversation.conversationId, handleConversationNewMessage);
        scrollToBottom();
      });
    }
  };

  const getSelectUsetList = inputValue => {
    return API.post('profiles/search/chat', { query: inputValue }).then(resp => {
      return resp.map(el => {
        return { value: el, label: el.name };
      });
    });
  };
  const sendMessage = () => {
    if (activeChat && text) {
      let uid = 0;
      if (activeChat === 'new') {
        if (searchRecipient) {
          if (searchRecipient === 'all') {
            setIsLoadingConversations(true);
            setConversations([]);
            if (window.innerWidth >= 768) setActiveChat('');
            return API.post('send_msg_to_followers', { text })
              .then(resp => {
                if (window.innerWidth >= 768) setActiveChat('');
                setSendButtonDisable(false);
                setText('');
                setSearchRecipient('');
                return true;
              })
              .catch(err => {
                if (window.innerWidth >= 768) setActiveChat('new');
                return false;
              })
              .finally(() => {
                setSendButtonDisable(false);
                setText('');
                loadConversationsAndSubscribe();
              });
          }
          uid = searchRecipient.id;
        } else {
          return false;
        }
      } else if (activeChat === 'empty') {
        if (search) {
          uid = search.id;
        } else {
          return false;
        }
      } else {
        uid = activeChat.uid;
      }
      chatService.sendTextMessage(uid, text).then(({ message, conversation }) => {
        if (activeChat === 'new' || activeChat === 'empty') {
          //create conversation or select from list
          selectConversationFromList(conversation);
        }
        scrollToBottom();
      });
      setText('');
    }
  };
  const handleFileSelect = e => {
    if (activeChat && activeChat.uid) {
      const file = Array.from(e.target.files);
      chatService.sendImageMessage(activeChat.uid, file[0]);
    }
  };
  const setActiveChatNew = () => {
    setShowHideDiv(false)
    if (window.innerWidth < 768) {
      document.getElementById('mobile-menu-footer').classList.add('d-none')
      document.getElementById('childrenDiv').classList.add('mb-0');
      document.getElementById('inbox-page').classList.remove('messages-cont-inbox');
    }
    setActiveChat('new');
    setSearchRecipient('');
    //reset chat subscription
    chatService.resetActiveConversationSubscriptions();
  };
  const handleConversationSearch = val => {
    console.log(val);
  };
  useEffect(() => {
    if (search) {
      setIsLoadingMessages(true);
      setActiveChatMessages([]);
      chatService.getConversationWithUid(search.id).then(conv => {
        if (conv) {
          selectConversationFromList(conv);
        } else {
          setActiveChat('empty');
          setIsLoadingMessages(false);
        }
      });
    }
  }, [search]);
  return (
    <div id="inbox-page" className={`col p-0 messages-cont d-flex ${window.innerWidth < 768 ? 'messages-cont-inbox' : ''}`}>
      {/* left side */}
      <Conversations
        showHideDiv={showHideDiv}
        conversations={conversations}
        isLoadingConversations={isLoadingConversations}
        selectConversationFromList={selectConversationFromList}
        hasMoreConversations={hasMoreConversations}
        getSelectUsetList={getSelectUsetList}
        loadMoreConversations={loadMoreConversations}
        search={search}
        setSearch={setSearch}
        setActiveChatNew={setActiveChatNew}
      />
      {/* right side */}
      <div className={`chat-cont ${window.innerWidth < 768 && (showHideDiv ? 'd-none' : 'd-block')}`}>
        <div className="chat-messages-cont ">
          {!!activeChat ? (
            <>
              {activeChat === 'new' ? (
                <div className="my-auto chat-broadcast">
                  <div className="d-flex">
                    <div className="cross-bg">
                      <XIcon
                        width={24}
                        onClick={() => {
                          setActiveChat(null);
                          setSearchRecipient('');
                          if (window.innerWidth < 768) {
                            setShowHideDiv(true); document.getElementById('mobile-menu-footer').classList.remove('d-none'); document.getElementById('childrenDiv').classList.remove('mb-0'); document.getElementById('inbox-page').classList.add('messages-cont-inbox');
                          }
                        }}
                        className="cursor-pointer pos-cross"
                      />
                    </div>
                    <p
                      className="text-center text-uppercase flex-grow-1 text-light-gray"
                      style={{ padding: '0 40px 0 20px' }}
                    >
                      {t('select user to start new message')}
                    </p>
                  </div>
                  <hr className="my-1" />
                  <div className="search-popup no-gutters">
                    <div className="d-flex align-items-center col-lg-12 col-12 search-out">
                      <AsyncSelect
                        cacheOptions
                        loadOptions={getSelectUsetList}
                        placeholder={t('Add New Recipient')}
                        onChange={e => setSearchRecipient(e.value)}
                        components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                        isDisabled={searchRecipient === 'all'}
                        styles={{
                          control: provided => ({
                            ...provided,
                            border: 'none !important',
                            boxShadow: 'none',
                          }),
                          container: provided => ({ ...provided, flex: 1 }),
                        }}
                      />

                      <SearchIcon width={17} style={{ margin: '0px 0.75rem' }} className="cursor-pointer" />
                    </div>
                    <div className="col-12 col-lg-6 d-flex align-items-center ">
                      <Form.Check
                        className="cursor-pointer ml-2"
                        type="checkbox"
                        id="age-terms"
                        name="agreed"
                        checked={searchRecipient === 'all'}
                        onChange={e => {
                          if (searchRecipient === 'all') setSearchRecipient('');
                          else setSearchRecipient('all');
                        }}
                        label={t('Or Send to all followers')}
                      />
                    </div>
                  </div>
                  {/* <hr className="my-1" /> */}
                </div>
              ) : activeChat === 'empty' ? (
                <div className="my-auto">
                  <div className="d-flex">
                    <XIcon width={24} onClick={() => setActiveChat(null)} className="cursor-pointer " />
                    <p className="text-center flex-grow-1 text-light-gray" style={{ padding: '0 40px 0 20px' }}>
                      {t('No messages with')}: {!!search && search.name}
                    </p>
                  </div>
                  <hr className="my-1" />
                  <p className="text-center">{t('Start messaging now')}</p>
                </div>
              ) : (
                <Loader isLoadin={isLoadingMessages && activeChatMessages.length === 0}>
                  <div className=" conversation-with text-light-gray py-3 px-4">
                    <div className="d-flex align-items-centr w-100">
                      <h2 className="chat-name">
                        <img src={backIcon} className="pr-2 cursor-pointer backIconMobile" onClick={() => { setShowHideDiv(true); document.getElementById('mobile-menu-footer').classList.remove('d-none'); document.getElementById('childrenDiv').classList.remove('mb-0'); document.getElementById('inbox-page').classList.add('messages-cont-inbox'); }} />
                        <Link to={USER_PROFILE.replace(
                          ':userId?',
                          !!activeChat.nickname ? activeChat.nickname : activeChat.id
                        )}>
                          {activeChat.name} </Link>
                      </h2>
                      <div className="dropdown dropleft float-right feed-drop show ml-auto">
                        <a href="javascript:void(0);" className="dropdown-toggle" data-toggle="dropdown" aria-expanded="true">
                          <img src={option} className=" ml-auto cursor-pointer" className="img-fluid" /> </a>
                        <div className="dropdown-menu" >
                          <a className="dropdown-item" href="javascript:void(0);">Delete</a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 flex-grow-1 messages-list" ref={scrollBottomRef}>
                    {hasMoreMessages && (
                      <Loader isLoadin={isLoadingMessages} height={36} size={28}>
                        <button className="btn btn-light mx-auto my-2 d-flex " onClick={loadMoreMessages}>
                          {t('Load More')}
                        </button>
                      </Loader>
                    )}
                    {activeChatMessages.map(el => (
                      <Message
                        msgData={el}
                        key={el.id}
                        isMe={user.id === Number(el.receiverId) ? true : false}
                        text={el.data.text}
                        attachments={el.data.attachments ? el.data.attachments : null}
                        scrollToBottom={scrollToBottom}
                        author={el.sender}
                      />
                    ))}
                    <div className="d-none" ref={scrollBottomRef}></div>
                  </div>
                </Loader>
              )}

              <div className="compose-msg border-top ">
                <div className=" w-90 position-relative">
                  <FormControl
                    as="textarea"
                    type="text"
                    className="form-control"
                    id="text"
                    name="text"
                    value={text}
                    onKeyDown={e => {
                      if (e.keyCode == 13 && !e.shiftKey) {
                        e.preventDefault();
                        if (searchRecipient === 'all') setSendButtonDisable(true);
                        sendMessage();
                      }
                    }}
                    onChange={e => {
                      setText(e.target.value);
                    }}
                    style={{ resize: 'none', border: 'none' }}
                    placeholder={t('Compose message...')}
                  />
                  <div className="smile-pos">
                    <Form.File id="formcheck-api-custom" className="pl-3">
                      <Form.File.Input
                        accept=".jpg,.jpeg,.webp,.gif,.bmp,.png"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      <Form.Label data-browse="Upload">
                        {/* <AddPhotoIcon width={27} className="cursor-pointer" /> */}
                        <img src={UploadIcon} className=" ml-auto cursor-pointer" />
                      </Form.Label>
                    </Form.File>
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  <button
                    disabled={sendButtonDisable}
                    type="submit"
                    className="btn btn-primary btn-submit ml-auto text-uppercase text-white "
                    style={{
                      borderRadius: '32px',
                      fontSize: '1.2rem',
                      padding: '0.5rem 1.3rem 0.5rem 1rem',
                    }}
                    onClick={() => {
                      if (searchRecipient === 'all') setSendButtonDisable(true);
                      sendMessage();
                    }}
                  >
                    {/* <PlaneIcon height="1.5rem" fill="#fff" /> */}
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="d-flex align-items-center justify-content-center flex-grow-1 flex-column">
              <p className="text-uppercase text-light-gray mb-3 text-center">
                {t('select conversation from the left to view')}
                <br />
                {t(' or start new message')}
              </p>
              <button
                type="submit"
                className="btn btn-dark text-uppercase text-white d-flex new-message-mobile-button"
                style={{ borderRadius: '32px', fontSize: '0.9rem', padding: '0.5rem 1.3rem 0.5rem 1rem' }}
                onClick={setActiveChatNew}
              >
                {t('new message')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
