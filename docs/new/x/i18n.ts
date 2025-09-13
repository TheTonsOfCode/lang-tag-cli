import { useTranslation } from '@toolkit3d/kiosk-i18n/client';
import type {
	CallableTranslations,
	LangTagTranslations,
	LangTagTranslationsConfig,
} from 'lang-tag';
import { createCallableTranslations } from 'lang-tag';

import { i18nLibrariesNamespaces } from '@/i18n-libs';
import initTranslations from '@/i18n-server';

export const i18nNamespaces = [
	// old ones: to remove in the future:
	'components',
	'root',
	'setup',
	'site-selected',

	// new proper ones:
	'products',
	'cart',
	...i18nLibrariesNamespaces,
];

export function i18n<T extends LangTagTranslations>(
	translations: T,
	config?: LangTagTranslationsConfig<
		'products' | 'cart' | (typeof i18nLibrariesNamespaces)[number]
	>,
) {
	type Type = CallableTranslations<T>;

	const namespace = config?.namespace || '';

	// Client
	const useT = () => {
		const { t } = useTranslation(namespace);

		return createCallableTranslations(translations, config, {
			transform: ({ path, params }) => t(path, params),
		});
	};

	// SSR
	const initT = async (language?: string) => {
		const { t } = await initTranslations({ language, namespaces: [namespace] });

		return createCallableTranslations(translations, config, {
			transform: ({ path, params }) => t(path, params),
		});
	};

	// SSR
	const keys = () => {
		return createCallableTranslations(translations, config, {
			transform: ({ path }) => path,
		});
	};

	return {
		useT,
		initT,
		keys,
		Type: {} as Type,
	};
}

/*
Moze to tutaj rozwiazac z providerem,
mozna na kazdy stworzyc Provider po namespace i uzywac tego w layoutach produktu itd...

const i18nNamespaces = ['components', 'root', 'setup', 'site-selected', 'products'];

export default async function Layout({ children, params: { lang } }) {
	const { resources } = await initTranslations({ language: lang, namespaces: i18nNamespaces });

	return (
		<TranslationsProvider namespaces={i18nNamespaces} language={lang} resources={resources}>
			<BaseLayout lang={lang}>{children}</BaseLayout>
		</TranslationsProvider>
	);
}

*/
