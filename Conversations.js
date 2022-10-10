import React, { useState } from 'react';
import AsyncSelect from 'react-select/async/dist/react-select.esm';
import { AddPhotoIcon, MailIcon, SearchIcon } from '../../components/Icons';
import Loader from '../../components/Loader';
import Avatar from '../../components/Avatar';

import searchIcon from '../../images/Group 3949.png'
import plusIcon from '../../images/icon.png'
import moment from 'moment';
import { useTranslation } from 'react-i18next';

const Conversations = ({
  showHideDiv,
  conversations,
  isLoadingConversations,
  selectConversationFromList,
  hasMoreConversations,
  getSelectUsetList,
  loadMoreConversations,
  search,
  setSearch,
  setActiveChatNew,
}) => {
  const { t } = useTranslation();
  const [activeClass, setActiveClass] = useState(0);
  const [searchField, setSearchField] = useState(false);

  return (
    <div className={`participant-list border-0 notif-bg ${window.innerWidth < 768 && (showHideDiv ? 'd-block' : 'd-none')}`}>
      <div className="d-flex align-items-center search-cont">
        <div className="d-flex align-items-center w-100">
          <p className="convo">Conversations</p>
          <img src={searchIcon} className="ml-auto cursor-pointer" onClick={() => setSearchField(!searchField)} />
          <img src={plusIcon} className="cursor-pointer ml-2" onClick={setActiveChatNew} />
        </div>
      </div>

      {searchField &&
        <div className="d-flex align-items-center search-cont">
          <div className="d-flex align-items-center w-100">
            <AsyncSelect
              className="user-search-bar"
              cacheOptions
              loadOptions={getSelectUsetList}
              placeholder={t('Search ')}
              value={search}
              onChange={e => setSearch(e.value)}
              components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
              styles={{
                control: provided => ({ ...provided, border: 'none !important', boxShadow: 'none' }),
                container: provided => ({ ...provided, flex: 1, maxWidth: 300 }),
              }}
            />
            {/* <SearchIcon width={24} style={{ margin: '0px 0.75rem' }} className="cursor-pointer" /> */}
          </div>
        </div>}

      {/* <p className="text-light-gray text-uppercase my-2 px-md-4 mx-1">{t('recent')}</p> */}
      <ul className="list-group list-group-flush pt-3 messages-box">
        <Loader isLoadin={isLoadingConversations && conversations.length === 0}>
          {!!conversations.length &&
            conversations.map(el => (
              <li
                key={el.conversationId}
                className={`list-group-item list-group-item-action cursor-pointer ${el.unreadMessageCount > 0 ? 'unread' : ''} ${activeClass === el.conversationId ? 'active' : ''}`}
                onClick={() => { selectConversationFromList(el); setActiveClass(el.conversationId) }}
              >
                <div className="d-flex">
                  <Avatar size={48} image={el.conversationWith.avatar} />
                  <div className="overflow-hidden w-100 ml-3 d-md-block">
                    <p>
                      <b>{el.conversationWith.name}</b>
                      <span className="text-light-gray">
                        {el.conversationWith.metadata &&
                          el.conversationWith.metadata.nickname &&
                          '\u00A0@' + el.conversationWith.metadata.nickname}
                      </span>
                      <small className="text-light-gray text-nowrap date-time-right">
                        {moment.unix(el.lastMessage.sentAt).fromNow()}
                      </small>
                    </p>
                    <div className="d-flex align-items-center overflow-hidden">
                      {el.lastMessage.type === 'text' && (
                        <>
                          {/* <MailIcon height={16} width={16} /> */}
                          <div className="flex-grow-1 overflow-hidden ">
                            <p className="text-truncate text-light-gray ">{el.lastMessage.data.text}</p>
                          </div>
                        </>
                      )}
                      {el.lastMessage.type !== 'text' && (
                        <>
                          <AddPhotoIcon height={16} width={16} />
                          <div className="flex-grow-1 overflow-hidden mx-2">
                            <p className="text-truncate text-light-gray ">{el.lastMessage.data.attachments[0].name}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          {hasMoreConversations && (
            <Loader isLoadin={isLoadingConversations} height={36} size={28}>
              <button className="btn btn-light mx-auto btn-chat my-2 d-flex " onClick={loadMoreConversations}>
                {t('Load More')}
              </button>
            </Loader>
          )}
        </Loader>
      </ul>
    </div>
  );
};

export default Conversations;
