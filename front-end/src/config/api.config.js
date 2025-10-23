const apiConfig = {
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
    endPoints: {
        // admin endpoints
        lockUser: '/api/admin/users/:id/lock', // post
        unlockUser: '/api/admin/users/:id/unlock', // post
        getAllUsers: '/api/admin/users', // get
        getAllTracks: '/api/admin/tracks', // get
        getAllPlaylists: '/api/admin/playlists', //get

        // auth endpoints
        register: '/api/auth/register', // post
        login: '/api/auth/login', // post
        forgotPassword: '/api/auth/forgot-password', // post
        staffLogin: '/api/auth/staff-login', // post
        resetPassword: '/api/auth/reset-password', // post
        activateAccount: '/api/auth//activate/:token', // post
        changePassword: '/api/auth/change-password', // post
        logout: '/api/auth/logout', // post

        // comment endpoints
        getCommentsOfTrack: '/api/comments/track/:trackId', // get
        createComment: '/api/comments', // post
        updateComment: '/api/comments/:commentId', // put 
        toggleLikeComment: '/api/comments/:commentId/like', // patch
        deleteComment: '/api/comments/:commentId', // delete

        // conversation endpoints
        createConversation: '/api/conversations', // post
        getConversationsForUser: '/api/conversations', // get
        deleteConversation: '/api/conversations/:conversationId', // delete

        // history endpoints
        getFeed: '/api/history/feed', // get
        getTopTracks: '/api/history/top-tracks', // get
        getFeedByUserId: '/api/history/user/:userId', //get 

        // message endpoints
        createMessage: '/api/messages', // post
        replyFeed: '/api/messages/reply-feed/history/:historyId', // post
        getMessages: '/api/messages/:conversationId', // get

        // notification endpoints
        getNotifications: '/api/notifications', // get
        markAsRead: '/api/notifications/:notificationId/read', // patch
        markAllAsRead: '/api/notifications/read-all', // patch
        deleteAllNotifications: '/api/notifications/delete-all', // delete
        deleteNotification: '/api/notifications/:notificationId', // delete
        getNotificationById: '/api/notifications/:notificationId', // get

        // playlist endpoints
        getTrendingPlaylists: '/api/playlists/trending', // get 
        getAllPlaylists: '/api/playlists/all', // get 
        getVisiblePlaylistsForUser: '/api/playlists', // get
        getPlaylistByUser: '/api/playlists/user/:userId/playlists', // get
        createPlaylist: '/api/playlists', // post
        toggleLikePlaylist: '/api/playlists/:id/toggle-like', // patch
        addTrackToPlaylist: '/api/playlists/:id/tracks/:trackId', // post
        removeTrackFromPlaylist: '/api/playlists/:id/tracks/:trackId', // delete
        updatePlaylistCoverArt: '/api/playlists/:id/cover', // put
        updatePlaylist: '/api/playlists/:id', // put
        getPlaylistById: '/api/playlists/:id', // get
        removePlaylistCoverArt: '/api/playlists/:id/cover', // delete
        deletePlaylist: '/api/playlists/:id', // delete

        // search endpoints
        searchTrack: '/api/search/tracks', // get
        searchPlaylist: '/api/search/playlists', // get
        searchUser: '/api/search/users', // get
        searchAll: '/api/search/all', // get

        // track endpoints
        getTrendingTracks: '/api/tracks/trending', // get
        getAllTracks: '/api/tracks/all', // get
        streamAudio: '/api/tracks/:id/stream', // get
        getTrackById: '/api/tracks/:id', // get
        getVisibleTracksForUser: '/api/tracks', // get
        getTrackByUser: '/api/tracks/user/:userId/tracks', // get
        uploadTrack: '/api/tracks', // post
        toggleLikeTrack: '/api/tracks/:id/toggle-like', // patch
        confirmPlay: '/api/tracks/:id/play', // post
        updateCoverArt: 'api/tracks/:id/cover', // put
        updateTrack: '/api/tracks/:id', // put
        removeTrackCoverArt: '/api/tracks/:id/cover', // delete
        deleteTrack: '/api/tracks/:id', // delete

        // user endpoints
        getUserProfile: '/api/users/profile', // get
        updateUserProfile: '/api/users/profile', // put
        updateAvatar: '/api/users/profile/avatar', // put
        getFollowers: '/api/users/followers', // get
        getFollowing: '/api/users/following', // get
        followUser: '/api/users/follow/:id', // post
        unfollowUser: '/api/users/unfollow/:id', // delete
        getLikedTracks: '/api/users/liked-tracks', // get
        getLikedPlaylists: '/api/users/liked-playlists', // get
        setCurrentListening: '/api/users/current-listening/:trackId', // put
        stopListening: '/api/users/stop-listening', // delete

    },
};

export const getApiURL = (key, params = {}) => {
    let endpoint = apiConfig.endPoints[key];
    if (!endpoint) {
        throw new Error(`API endpoint for key "${key}" not found.`);
    }
    for (const [paramKey, paramValue] of Object.entries(params)) {
        endpoint = endpoint.replace(`:${paramKey}`, paramValue);
    }
    return `${apiConfig.baseURL}${endpoint}`;
};

export default apiConfig;