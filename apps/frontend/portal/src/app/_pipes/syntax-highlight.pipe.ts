/**
 */

import { Pipe, PipeTransform } from '@angular/core';
import hljs from 'highlight.js';

type TSupportedLanguages = 'typescript' | 'bash';

@Pipe({
    name: 'syntaxHighlight',
})
export class SyntaxHighlightPipe implements PipeTransform {

    private readonly languageMap: Set<TSupportedLanguages> = new Set();
    private readonly languageMapIsLoading: Set<TSupportedLanguages> = new Set();

    public transform(
        snippet: string,
        language: TSupportedLanguages,
    ): string {
        if (!this.languageMap.has(language) && !this.languageMapIsLoading.has(language)) {
            this.languageMapIsLoading.add(language);
            // oxlint-disable-next-line typescript/no-floating-promises
            loadLanguage(language)
                .then(() => {
                    console.log(`Language '${language}' loaded successfully.`);
                    this.languageMapIsLoading.delete(language);
                })

                ;
            this.languageMap.add(language);
        }

        return hljs.highlight(snippet, { language }).value;
    }
}

const loadLanguage = async (
    language: TSupportedLanguages,
) => {
    let module;
    switch (language) {
        case 'typescript': {
            module = await import(`highlight.js/lib/languages/typescript`);
            break;
        }

        case 'bash': {
            module = await import(`highlight.js/lib/languages/bash`);
            break;
        }
    }

    // oxlint-disable-next-line typescript/no-unnecessary-condition
    if (module) {
        hljs
            .registerLanguage(language, module.default);
    } else {
        throw new Error(`Failed loading language: '${language}'`);
    }
};