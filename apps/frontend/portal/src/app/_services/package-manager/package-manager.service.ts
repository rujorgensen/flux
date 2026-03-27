/**
 * Shared service that persists the user's preferred package manager across all docs pages.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TPackageManager = 'bun' | 'npm' | 'pnpm' | 'yarn';

@Injectable({
    providedIn: 'root',
})
export class PackageManagerService {

    private readonly _selectedPm$ = new BehaviorSubject<TPackageManager>('bun');
    public readonly selectedPm$ = this._selectedPm$.asObservable();

    public readonly installCommands: Record<TPackageManager, (pkg: string) => string> = {
        bun:  (pkg) => `bun add ${pkg}`,
        npm:  (pkg) => `npm install ${pkg}`,
        pnpm: (pkg) => `pnpm add ${pkg}`,
        yarn: (pkg) => `yarn add ${pkg}`,
    };

    public select(
        pm: TPackageManager,
    ): void {
        this._selectedPm$.next(pm);
    }
}
