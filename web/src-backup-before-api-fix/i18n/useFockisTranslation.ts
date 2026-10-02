import { useCallback, useEffect, useState } from "react";

import {
getLanguage,
subscribeToLanguage,
t as translate,
} from "./index";

import type { FockisLanguage } from "./language";

export type FockisTranslationVariables = Record<
string,
string | number

> ;

export function useFockisTranslation() {
const [language, setLanguage] =
useState<FockisLanguage>(getLanguage());

useEffect(() => {
const unsubscribe = subscribeToLanguage(
(nextLanguage) => {
setLanguage(nextLanguage);
},
);

return unsubscribe;

}, []);

const t = useCallback(
(
key: string,
variables?: FockisTranslationVariables,
): string => {
return translate(key, variables);
},
[],
);

return {
t,
language,
};
}

export default useFockisTranslation;
