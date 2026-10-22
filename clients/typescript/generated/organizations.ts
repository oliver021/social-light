// AUTO-GENERATED from specs/organizations.json. Do not edit.

export interface paths {
    "/api/organizations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List organizations */
        get: operations["ListOrganizations"];
        put?: never;
        /** Create a organization */
        post: operations["CreateOrganization"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organizations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a organization by id */
        get: operations["GetOrganization"];
        put?: never;
        post?: never;
        /** Delete a organization */
        delete: operations["DeleteOrganization"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organization-members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List organizationMembers */
        get: operations["ListOrganizationMembers"];
        put?: never;
        /** Create a organizationMember */
        post: operations["CreateOrganizationMember"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/organization-members/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get a organizationMember by id */
        get: operations["GetOrganizationMember"];
        put?: never;
        post?: never;
        /** Delete a organizationMember */
        delete: operations["DeleteOrganizationMember"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        CreateOrganizationMemberRequest: {
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            userId: string;
            role: string;
        };
        CreateOrganizationRequest: {
            /** Format: uuid */
            ownerId: string;
            name: string;
            description: null | string;
            logo: null | string;
            verificationStatus: string;
        };
        OrganizationDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            ownerId: string;
            name: string;
            description: null | string;
            logo: null | string;
            verificationStatus: string;
        };
        OrganizationMemberDto: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            organizationId: string;
            /** Format: uuid */
            userId: string;
            role: string;
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
    ListOrganizations: {
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
                    "application/json": components["schemas"]["OrganizationDto"][];
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
    CreateOrganization: {
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
                "application/json": components["schemas"]["CreateOrganizationRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationDto"];
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
    GetOrganization: {
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
                    "application/json": components["schemas"]["OrganizationDto"];
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
    DeleteOrganization: {
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
    ListOrganizationMembers: {
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
                    "application/json": components["schemas"]["OrganizationMemberDto"][];
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
    CreateOrganizationMember: {
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
                "application/json": components["schemas"]["CreateOrganizationMemberRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OrganizationMemberDto"];
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
    GetOrganizationMember: {
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
                    "application/json": components["schemas"]["OrganizationMemberDto"];
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
    DeleteOrganizationMember: {
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
