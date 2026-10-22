// AUTO-GENERATED from specs/social-graph.json. Do not edit.

export interface paths {
    "/api/follows": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List follows */
        get: operations["ListFollows"];
        put?: never;
        /** Create a follow */
        post: operations["CreateFollow"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/follows/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a follow by id */
        get: operations["GetFollow"];
        put?: never;
        post?: never;
        /** Delete a follow */
        delete: operations["DeleteFollow"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/friends": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List friends */
        get: operations["ListFriends"];
        put?: never;
        /** Create a friend */
        post: operations["CreateFriend"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/friends/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a friend by id */
        get: operations["GetFriend"];
        put?: never;
        post?: never;
        /** Delete a friend */
        delete: operations["DeleteFriend"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/blocks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List blocks */
        get: operations["ListBlocks"];
        put?: never;
        /** Create a block */
        post: operations["CreateBlock"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/blocks/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a block by id */
        get: operations["GetBlock"];
        put?: never;
        post?: never;
        /** Delete a block */
        delete: operations["DeleteBlock"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/user-preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List userPreferences */
        get: operations["ListUserPreferences"];
        put?: never;
        /** Create a userPreference */
        post: operations["CreateUserPreference"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/user-preferences/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a userPreference by id */
        get: operations["GetUserPreference"];
        put?: never;
        post?: never;
        /** Delete a userPreference */
        delete: operations["DeleteUserPreference"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        BlockDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            blockerId: string;
            /** Format: uuid */
            blockedId: string;
            reason: null | string;
        };
        CreateBlockRequest: {
            /** Format: uuid */
            blockerId: string;
            /** Format: uuid */
            blockedId: string;
            reason: null | string;
        };
        CreateFollowRequest: {
            /** Format: uuid */
            followerId: string;
            /** Format: uuid */
            followingId: string;
            status: string;
            /** Format: date-time */
            createdAt: string;
        };
        CreateFriendRequest: {
            /** Format: uuid */
            requesterId: string;
            /** Format: uuid */
            recipientId: string;
            status: string;
            /** Format: date-time */
            acceptedAt: null | string;
        };
        CreateUserPreferenceRequest: {
            /** Format: uuid */
            userId: string;
            entityType: string;
            /** Format: uuid */
            entityId: string;
            preferenceType: string;
            /** Format: date-time */
            expiresAt: null | string;
        };
        FollowDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            followerId: string;
            /** Format: uuid */
            followingId: string;
            status: string;
            /** Format: date-time */
            createdAt: string;
        };
        FriendDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            requesterId: string;
            /** Format: uuid */
            recipientId: string;
            status: string;
            /** Format: date-time */
            acceptedAt: null | string;
        };
        UserPreferenceDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            userId: string;
            entityType: string;
            /** Format: uuid */
            entityId: string;
            preferenceType: string;
            /** Format: date-time */
            expiresAt: null | string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    ListFollows: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FollowDto"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CreateFollow: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateFollowRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FollowDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    GetFollow: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FollowDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DeleteFollow: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ListFriends: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FriendDto"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CreateFriend: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateFriendRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FriendDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    GetFriend: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FriendDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DeleteFriend: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ListBlocks: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockDto"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CreateBlock: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateBlockRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    GetBlock: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BlockDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DeleteBlock: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    ListUserPreferences: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserPreferenceDto"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    CreateUserPreference: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateUserPreferenceRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserPreferenceDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    GetUserPreference: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["UserPreferenceDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    DeleteUserPreference: {
        parameters: {
            query?: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version"?: string;
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
