export type NotificationType =
    | "POST_LIKE"
    | "POST_COMMENT"
    | "COMMENT_LIKE"
    | "NEW_MESSAGE"
    | "FOLLOW_REQUEST"
    | "FOLLOW_ACCEPTED"
    | "MENTION"
    | "NEW_POST";

export interface NotificationActor {
    _id: string;
    username: string;
    profilePicture?: string;
}

export interface Notification {
    _id: string;
    type: NotificationType;
    actor: NotificationActor;
    entityType: string;
    entityId: string;
    metadata: Record<string, string>;
    read: boolean;
    createdAt: string;
}