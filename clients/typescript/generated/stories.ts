// AUTO-GENERATED from specs/stories.json. Do not edit.

export interface paths {
    "/api/stories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List stories */
        get: operations["ListStories"];
        put?: never;
        /** Create a story */
        post: operations["CreateStory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/stories/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a story by id */
        get: operations["GetStory"];
        put?: never;
        post?: never;
        /** Delete a story */
        delete: operations["DeleteStory"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/story-views": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List storyViews */
        get: operations["ListStoryViews"];
        put?: never;
        /** Create a storyView */
        post: operations["CreateStoryView"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/story-views/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a storyView by id */
        get: operations["GetStoryView"];
        put?: never;
        post?: never;
        /** Delete a storyView */
        delete: operations["DeleteStoryView"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/story-replies": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List storyReplies */
        get: operations["ListStoryReplies"];
        put?: never;
        /** Create a storyReply */
        post: operations["CreateStoryReply"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/story-replies/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a storyReply by id */
        get: operations["GetStoryReply"];
        put?: never;
        post?: never;
        /** Delete a storyReply */
        delete: operations["DeleteStoryReply"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        CreateStoryReplyRequest: {
            /** Format: uuid */
            storyId: string;
            /** Format: uuid */
            userId: string;
            body: string;
        };
        CreateStoryRequest: {
            /** Format: uuid */
            authorId: string;
            mediaType: string;
            mediaUrl: string;
            caption: null | string;
            visibility: string;
            /** Format: date-time */
            expiresAt: string;
        };
        CreateStoryViewRequest: {
            /** Format: uuid */
            storyId: string;
            /** Format: uuid */
            viewerId: string;
            /** Format: date-time */
            viewedAt: string;
        };
        StoryDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            authorId: string;
            mediaType: string;
            mediaUrl: string;
            caption: null | string;
            visibility: string;
            /** Format: date-time */
            expiresAt: string;
        };
        StoryReplyDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            storyId: string;
            /** Format: uuid */
            userId: string;
            body: string;
        };
        StoryViewDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            storyId: string;
            /** Format: uuid */
            viewerId: string;
            /** Format: date-time */
            viewedAt: string;
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
    ListStories: {
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
                    "application/json": components["schemas"]["StoryDto"][];
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
    CreateStory: {
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
                "application/json": components["schemas"]["CreateStoryRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StoryDto"];
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
    GetStory: {
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
                    "application/json": components["schemas"]["StoryDto"];
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
    DeleteStory: {
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
    ListStoryViews: {
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
                    "application/json": components["schemas"]["StoryViewDto"][];
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
    CreateStoryView: {
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
                "application/json": components["schemas"]["CreateStoryViewRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StoryViewDto"];
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
    GetStoryView: {
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
                    "application/json": components["schemas"]["StoryViewDto"];
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
    DeleteStoryView: {
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
    ListStoryReplies: {
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
                    "application/json": components["schemas"]["StoryReplyDto"][];
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
    CreateStoryReply: {
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
                "application/json": components["schemas"]["CreateStoryReplyRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StoryReplyDto"];
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
    GetStoryReply: {
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
                    "application/json": components["schemas"]["StoryReplyDto"];
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
    DeleteStoryReply: {
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
