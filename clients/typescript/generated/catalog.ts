// AUTO-GENERATED from specs/catalog.json. Do not edit.

export interface paths {
    "/api/catalog/items/by": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Batch get catalog items
         * @description Get multiple items from the catalog
         */
        get: operations["BatchGetItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/items/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get catalog item
         * @description Get an item from the catalog
         */
        get: operations["GetItem"];
        put?: never;
        post?: never;
        /**
         * Delete catalog item
         * @description Delete the specified catalog item
         */
        delete: operations["DeleteItem"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/items/{id}/pic": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get catalog item picture
         * @description Get the picture for a catalog item
         */
        get: operations["GetItemPicture"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/catalogtypes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List catalog item types
         * @description Get a list of the types of catalog items
         */
        get: operations["ListItemTypes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/catalogbrands": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List catalog item brands
         * @description Get a list of the brands of catalog items
         */
        get: operations["ListItemBrands"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List catalog items
         * @description Get a paginated list of items in the catalog.
         */
        get: operations["ListItems"];
        /**
         * Create or replace a catalog item
         * @description Create or replace a catalog item
         */
        put: operations["UpdateItem"];
        /**
         * Create a catalog item
         * @description Create a new item in the catalog
         */
        post: operations["CreateItem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/items/by/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get catalog items by name
         * @description Get a paginated list of catalog items with the specified name.
         */
        get: operations["GetItemsByName"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/items/withsemanticrelevance/{text}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Search catalog for relevant items
         * @description Search the catalog for items related to the specified text
         */
        get: operations["GetRelevantItems"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/items/type/{typeId}/brand/{brandId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get catalog items by type and brand
         * @description Get catalog items of the specified type and brand
         */
        get: operations["GetItemsByTypeAndBrand"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/catalog/items/type/all/brand/{brandId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List catalog items by brand
         * @description Get a list of catalog items for the specified brand
         */
        get: operations["GetItemsByBrand"];
        put?: never;
        post?: never;
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
        CatalogBrand: {
            /** Format: int32 */
            id?: number | string;
            brand: string;
        };
        CatalogItem: {
            /** Format: int32 */
            id?: number | string;
            name: string;
            description?: null | string;
            /** Format: double */
            price?: number | string;
            pictureFileName?: null | string;
            /** Format: int32 */
            catalogTypeId?: number | string;
            catalogType?: null | components["schemas"]["CatalogType"];
            /** Format: int32 */
            catalogBrandId?: number | string;
            catalogBrand?: null | components["schemas"]["CatalogBrand"];
            /** Format: int32 */
            availableStock?: number | string;
            /** Format: int32 */
            restockThreshold?: number | string;
            /** Format: int32 */
            maxStockThreshold?: number | string;
            onReorder?: boolean;
        };
        CatalogType: {
            /** Format: int32 */
            id?: number | string;
            type: string;
        };
        PaginatedItemsOfCatalogItem: {
            /** Format: int32 */
            pageIndex: number | string;
            /** Format: int32 */
            pageSize: number | string;
            /** Format: int64 */
            count: number | string;
            data: components["schemas"]["CatalogItem"][];
        };
        ProblemDetails: {
            type?: null | string;
            title?: null | string;
            /** Format: int32 */
            status?: null | number | string;
            detail?: null | string;
            instance?: null | string;
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
    BatchGetItems: {
        parameters: {
            query: {
                /** @description List of ids for catalog items to return */
                ids: (number | string)[];
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
                    "application/json": components["schemas"]["CatalogItem"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetItem: {
        parameters: {
            query: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path: {
                /** @description The catalog item id */
                id: number;
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
                    "application/json": components["schemas"]["CatalogItem"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProblemDetails"];
                };
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
    DeleteItem: {
        parameters: {
            query: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path: {
                /** @description The id of the catalog item to delete */
                id: number;
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
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    GetItemPicture: {
        parameters: {
            query: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path: {
                /** @description The catalog item id */
                id: number;
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
                    "application/octet-stream": string;
                    "image/png": string;
                    "image/gif": string;
                    "image/jpeg": string;
                    "image/bmp": string;
                    "image/tiff": string;
                    "image/wmf": string;
                    "image/jp2": string;
                    "image/svg+xml": string;
                    "image/webp": string;
                };
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
    ListItemTypes: {
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
                    "application/json": components["schemas"]["CatalogType"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListItemBrands: {
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
                    "application/json": components["schemas"]["CatalogBrand"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListItems: {
        parameters: {
            query: {
                /** @description Number of items to return in a single page of results */
                PageSize?: number | string;
                /** @description The index of the page of results to return */
                PageIndex?: number | string;
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
                    "application/json": components["schemas"]["PaginatedItemsOfCatalogItem"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpdateItem: {
        parameters: {
            query: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CatalogItem"];
            };
        };
        responses: {
            /** @description Created */
            201: {
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
                    "application/json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CreateItem: {
        parameters: {
            query: {
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CatalogItem"];
            };
        };
        responses: {
            /** @description Created */
            201: {
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
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetItemsByName: {
        parameters: {
            query: {
                /** @description Number of items to return in a single page of results */
                PageSize?: number | string;
                /** @description The index of the page of results to return */
                PageIndex?: number | string;
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path: {
                /** @description The name of the item to return */
                name: string;
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
                    "application/json": components["schemas"]["PaginatedItemsOfCatalogItem"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetRelevantItems: {
        parameters: {
            query: {
                /** @description Number of items to return in a single page of results */
                PageSize?: number | string;
                /** @description The index of the page of results to return */
                PageIndex?: number | string;
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path: {
                /** @description The text string to use when search for related items in the catalog */
                text: string;
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
                    "application/json": components["schemas"]["PaginatedItemsOfCatalogItem"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetItemsByTypeAndBrand: {
        parameters: {
            query: {
                /** @description Number of items to return in a single page of results */
                PageSize?: number | string;
                /** @description The index of the page of results to return */
                PageIndex?: number | string;
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path: {
                /** @description The type of items to return */
                typeId: number | string;
                /** @description The brand of items to return */
                brandId: number | string;
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
                    "application/json": components["schemas"]["PaginatedItemsOfCatalogItem"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetItemsByBrand: {
        parameters: {
            query: {
                /** @description Number of items to return in a single page of results */
                PageSize?: number | string;
                /** @description The index of the page of results to return */
                PageIndex?: number | string;
                /** @description The API version, in the format 'major.minor'. */
                "api-version": string;
            };
            header?: never;
            path: {
                /** @description The brand of items to return */
                brandId: number | string;
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
                    "application/json": components["schemas"]["PaginatedItemsOfCatalogItem"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
}
