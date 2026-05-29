import { Pipe, type PipeTransform } from '@angular/core';

export interface IUserInfo {
    id: string;
    name?: string;
    email?: string;
}

/**
 * Resolves a userId to a human-readable display name.
 *
 * Usage: `userId | userName: userInfoMap`
 *
 * Falls back to `name` → `email` → raw `userId` when the map entry is absent.
 * The component is responsible for building and passing in the userInfoMap.
 */
@Pipe({
    name: 'userName',
    standalone: true,
    pure: true,
})
export class UserNamePipe implements PipeTransform {
    transform(
        userId: string,
        users: Record<string, IUserInfo> = {},
    ): string {
        const user = users[userId];
        // oxlint-disable-next-line typescript/no-unnecessary-condition
        return user?.name ?? user?.email ?? userId;
    }
}
