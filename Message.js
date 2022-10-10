import moment from 'moment';
import React, { useState } from 'react';
import Lightbox from 'react-image-lightbox';
import { Link } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import { USER_PROFILE } from '../../constants/routes';
import defaultAvatar from '../../images/default-avatar.jpg'
import md5 from 'md5';


const Message = ({ msgData, author, isMe, text, attachments, scrollToBottom, ...rest }) => {
  const [previewData, setPreviewData] = useState({ visible: false, post: null })
  return (
    <div className={`msg-box my-2 ${isMe ? 'me' : ''}`} {...rest}>
      <Link target="_blank" to={USER_PROFILE.replace(
        ':userId?',
        !!msgData?.sender?.metadata?.nickname ? msgData?.sender?.metadata?.nickname : msgData?.sender?.metadata?.id
      )}>
        <Avatar size={48} image={author.avatar ? author.avatar : defaultAvatar} />
      </Link>
      {!!text && <p className="text-msg">
        {text}
        <span>
          {moment.unix(msgData.sentAt).fromNow()}
        </span>
      </p>}
      {!!attachments && <p className="img-msg">
        <img src={attachments[0].url} className="img-fluid cursor-pointer" alt="image" onLoad={scrollToBottom} onClick={() => setPreviewData({ visible: true, post: [attachments[0].url], photoIndex: 0 })} />
      </p>}

      {previewData.visible && <Lightbox
        mainSrc={previewData.post[previewData.photoIndex]}
        nextSrc={undefined}
        prevSrc={undefined}
        onCloseRequest={() => setPreviewData({ visible: false, post: null, photoIndex: 0 })}
        onMovePrevRequest={() => setPreviewData({ ...previewData, photoIndex: (previewData.photoIndex + previewData.post.length - 1) % previewData.post.length })}
        onMoveNextRequest={() => setPreviewData({ ...previewData, photoIndex: (previewData.photoIndex + 1) % previewData.post.length })}
      />}
    </div>
  );
};

export default Message;
