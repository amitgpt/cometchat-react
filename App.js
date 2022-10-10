import chatService from './chatService';
const App = props => {
    const { t } = useTranslation();
    const user = useSelector(selectAuthUser);
    const isLoading = useSelector(selectIsAuthorizing);
    const unreadNotificationsCount = useSelector(selectUnreadNotificationsCount);
    // const creditCards = useSelector(selectCreditCards);
    const creditCardsStripe = useSelector(selectCreditCardsStripe);
    const location = useLocation();
    const dispatch = useDispatch();
    const token = getToken();

    useEffect(() => {
        if (token && !user && !isLoading) {
            //get token user data
            dispatch(getCurrentUser());
        }
        // if (user && !creditCards.length) {
        //   dispatch(fetchCreditCards()).catch(e => {
        //     console.log('fetch credit cards error', e);
        //     //try once more
        //     dispatch(fetchCreditCards());
        //   });
        // }
        // if (user && user.role != 1 && !creditCards.length) {
        //   dispatch(fetchCreditCards()).catch(e => {
        //     console.log('fetch credit cards error', e);
        //     //try once more
        //     dispatch(fetchCreditCardsStripe());
        //   });
        // }



        if (user && user.role != 1 && !creditCardsStripe.length) {
            dispatch(fetchCreditCardsStripe()).catch(e => {
                console.log('fetch credit cards error', e);
                //try once more
                dispatch(fetchCreditCardsStripe());
            });
        }

        if(user && user.role != 1){
            dispatch(fetchUnreadNotifications());
        }

        if (user && user.role != 1 && !chatService.initialized) {
            let chatToken = user.chat_token;
            if (chatToken) {
                initCHat(chatToken);
            } else {
                API.post('create_chat_user').then(resp => {
                    initCHat(resp);
                });
            }
            //firebaseService.init();
        }
    }, [user]);
    const initCHat = chatToken => {
        chatService.init(chatToken).then(resp => {
            //set chat token after chat and client is initialized
            if (resp) {
                dispatch(setChatTokenActionCreator(chatToken));
                if (location.pathname !== MESSAGES) {
                    chatService.getUnreadMessageCount().then(resp => {
                        if (Object.keys(resp).length > 0) {
                            //unreadMessageCount, show notificaiton
                            dispatch(setChatUnreadCountActionCreator(1));
                        }
                    });
                }
            }
        });
    };
