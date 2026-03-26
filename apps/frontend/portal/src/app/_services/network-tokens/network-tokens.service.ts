import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { api } from '../api/api';

export interface ITokenMetadata {
    id: string;
    index: number;
    isPrimary: boolean;
    entityCount: number;
    createdAt: string;
    createdBy: string;
    rotatedOutAt: string | null;
}

@Injectable({
    providedIn: 'root',
})
export class NetworkTokensService {

    constructor() { }

    public readTokens$(
        networkId: string,
    ): Observable<ITokenMetadata[]> {
        return from(
            api
                .api
                .networks({
                    networkId,
                })
                .tokens
                .get()
                .then((response) => {
                    if (!response.data) {
                        throw new Error('No tokens returned from API');
                    }

                    return response.data;
                }),
        );
    }

    public createToken$(
        networkId: string,
    ): Observable<ITokenMetadata> {
        return from(
            api
                .api
                .networks({
                    networkId,
                })
                .tokens
                .post()
                .then((response) => {
                    if (!response.data) {
                        throw new Error('No token returned from API');
                    }

                    return response.data;
                }),
        );
    }

    public revealToken$(
        networkId: string,
        tokenIndex: number,
    ): Observable<string> {
        return from(
            api
                .api
                .networks({
                    networkId,
                })
                .tokens
                .reveal
                .get(
                    {
                        query: {
                            tokenIndex,
                        },
                    },
                )
                .then((response) => {
                    if (!response.data) {
                        throw new Error('No token value returned from API');
                    }

                    return response.data.value;
                }),
        );
    }

    public delete$(
        networkId: string,
        tokenIndex: number,
    ): Observable<string> {
        return from(
            api
                .api
                .networks({
                    networkId,
                })
                .tokens
                .delete(
                    {},
                    {
                        query: {
                            tokenIndex,
                        },
                    },
                )
                .then((response) => {
                    if (!response.data) {
                        throw new Error('No response from API');
                    }

                    return response.data.message;
                }),
        );
    }

}
