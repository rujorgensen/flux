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

    public transform(
        snippet: string,
        language: TSupportedLanguages,
    ): string {
        if (!this.languageMap.has(language)) {
            loadLanguage(language)
                .then(() => {
                    console.log(`Language '${language}' loaded successfully.`);
                });
            this.languageMap.add(language);
        }

        return hljs.highlight(
            snippet,
            { language }
        ).value;
    }
}

const loadLanguage = async (
    language: TSupportedLanguages,
) => {
    const module = await import(`highlight.js/lib/languages/${language}`);
    hljs.registerLanguage(language, module.default);
};