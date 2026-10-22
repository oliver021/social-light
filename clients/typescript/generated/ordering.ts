// AUTO-GENERATED from specs/ordering.json. Do not edit.

export interface paths {
    "/api/orders/cancel": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query: {
                    /** @description The API version, in the format 'major.minor'. */
                    "api-version": string;
                };
                header: {
                    "x-requestid": string;
                };
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CancelOrderCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": string;
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders/ship": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: {
            parameters: {
                query: {
                    /** @description The API version, in the format 'major.minor'. */
                    "api-version": string;
                };
                header: {
                    "x-requestid": string;
                };
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["ShipOrderCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": string;
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
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders/{orderId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query: {
                    /** @description The API version, in the format 'major.minor'. */
                    "api-version": string;
                };
                header?: never;
                path: {
                    orderId: number;
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
                        "application/json": components["schemas"]["Order"];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query: {
                    /** @description The API version, in the format 'major.minor'. */
                    "api-version": string;
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
                        "application/json": components["schemas"]["OrderSummary"][];
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
        put?: never;
        post: {
            parameters: {
                query: {
                    /** @description The API version, in the format 'major.minor'. */
                    "api-version": string;
                };
                header: {
                    "x-requestid": string;
                };
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateOrderRequest"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Bad Request */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": string;
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders/cardtypes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: {
            parameters: {
                query: {
                    /** @description The API version, in the format 'major.minor'. */
                    "api-version": string;
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
                        "application/json": components["schemas"]["CardType"][];
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
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/orders/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: {
            parameters: {
                query: {
                    /** @description The API version, in the format 'major.minor'. */
                    "api-version": string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateOrderDraftCommand"];
                };
            };
            responses: {
                /** @description OK */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["OrderDraftDTO"];
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
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        BasketItem: {
            id?: null | string;
            /** Format: int32 */
            productId?: number | string;
            productName?: null | string;
            /** Format: double */
            unitPrice?: number | string;
            /** Format: double */
            oldUnitPrice?: number | string;
            /** Format: int32 */
            quantity?: number | string;
            pictureUrl?: null | string;
        };
        CancelOrderCommand: {
            /** Format: int32 */
            orderNumber: number | string;
        };
        CardType: {
            /** Format: int32 */
            id?: number | string;
            name?: null | string;
        };
        CreateOrderDraftCommand: {
            buyerId: null | string;
            items: null | components["schemas"]["BasketItem"][];
        };
        CreateOrderRequest: {
            userId: null | string;
            userName: null | string;
            city: null | string;
            street: null | string;
            state: null | string;
            country: null | string;
            zipCode: null | string;
            cardNumber: null | string;
            cardHolderName: null | string;
            /** Format: date-time */
            cardExpiration: string;
            cardSecurityNumber: null | string;
            /** Format: int32 */
            cardTypeId: number | string;
            buyer: null | string;
            items: null | components["schemas"]["BasketItem"][];
        };
        Order: {
            /** Format: int32 */
            orderNumber?: number | string;
            /** Format: date-time */
            date?: string;
            status?: null | string;
            description?: null | string;
            street?: null | string;
            city?: null | string;
            state?: null | string;
            zipcode?: null | string;
            country?: null | string;
            orderItems?: null | components["schemas"]["Orderitem"][];
            /** Format: double */
            total?: number | string;
        };
        OrderDraftDTO: {
            orderItems?: null | components["schemas"]["OrderItemDTO"][];
            /** Format: double */
            total?: number | string;
        };
        Orderitem: {
            productName?: null | string;
            /** Format: int32 */
            units?: number | string;
            /** Format: double */
            unitPrice?: number | string;
            pictureUrl?: null | string;
        };
        OrderItemDTO: {
            /** Format: int32 */
            productId?: number | string;
            productName?: null | string;
            /** Format: double */
            unitPrice?: number | string;
            /** Format: double */
            discount?: number | string;
            /** Format: int32 */
            units?: number | string;
            pictureUrl?: null | string;
        };
        OrderSummary: {
            /** Format: int32 */
            orderNumber?: number | string;
            /** Format: date-time */
            date?: string;
            status?: null | string;
            /** Format: double */
            total?: number | string;
        };
        ShipOrderCommand: {
            /** Format: int32 */
            orderNumber: number | string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
