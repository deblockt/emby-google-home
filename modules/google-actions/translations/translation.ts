import { vsprintf } from 'sprintf-js'

export class Translation {
    constructor(private translations: any) {}

    get(key: string, values: string[] = []) {
        const translations: string[] = this.translations[key]
        if (!translations) {
            return key
        }

        const random = Math.floor(Math.random() * translations.length)
        return vsprintf(translations[random], values)
    }
}

// fix issue in TS 2.4
export const languageImporter = { run(lang: string) { return import('./' + lang); } }

export class TranslationFactory {
    private static translations: {[key: string]: Translation} = {}

    static async create(language: string): Promise<Translation> {
        language = language || 'fr-FR'
        
        if (this.translations[language] == undefined) {
            try {
                const translations = await languageImporter.run(language)
                this.translations[language] = new Translation(translations.translations)
            } catch (e) {
                return TranslationFactory.create('fr-FR')
            }
        }
        return this.translations[language]        
    }
}