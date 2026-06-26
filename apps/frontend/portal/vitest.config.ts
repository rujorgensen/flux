import { defineConfig } from 'vitest/config';

// Workaround for angular/angular-cli#31732: the `@angular/build:unit-test`
// vitest runner can load a second copy of `@angular/core/testing` from
// node_modules, separate from the one bundled into the generated TestBed
// init setup file. That split means `initTestEnvironment()` runs against a
// different singleton than the specs, surfacing as
// "Need to call TestBed.initTestEnvironment() first". Deduping + inlining the
// Angular packages forces a single shared instance.
export default defineConfig({
    resolve: {
        dedupe: [
            '@angular/core',
            '@angular/core/testing',
            '@angular/platform-browser',
            '@angular/platform-browser/testing',
        ],
    },
    test: {
        server: {
            deps: {
                // `ngx-sonner` is inlined as well so its `@angular/core` import
                // resolves to the same deduped copy; otherwise its
                // `inject(PLATFORM_ID)` runs against a second core instance and
                // throws NG0203.
                inline: [/@angular\//, 'ngx-sonner'],
            },
        },
    },
});
