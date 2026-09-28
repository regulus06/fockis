import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// ============================================================================
// GLOBAL STYLES
// ============================================================================

import "./styles/imageSystem.scss";
import "./index.scss";
import "./features/careers/styles/global.scss";
import "./features/fockis-translation/styles/FockisTranslation.scss";

// ============================================================================
// APPLICATION
// ============================================================================

import App from "./App";
import StripeProvider from "./features/payments/StripeProvider";

// ============================================================================
// FOCKIS UI LANGUAGE SYSTEM
// ============================================================================

import { getInitialLanguage } from "./i18n/language";
import { setLanguage } from "./i18n";

// ============================================================================
// FOCKIS GLOBAL CONTENT TRANSLATION SYSTEM
// ============================================================================

import FockisTranslationProvider from "./features/fockis-translation/context/FockisTranslationContext";

// ============================================================================
// FOCKIS AUTOMATIC PAGE TRANSLATION SYSTEM
// ============================================================================
//
// This provider automatically watches the rendered application and translates
// visible text without requiring every individual page/component to import
// the translation provider.
//
// IMPORTANT:
// AutoTranslateProvider is exported as a NAMED export from:
// ./i18n/AutoTranslateProvider
//
// Therefore it must be imported with:
// import { AutoTranslateProvider } from "./i18n/AutoTranslateProvider";
//
// Pages do NOT need to be modified individually.
// ============================================================================

import { AutoTranslateProvider } from "./i18n/AutoTranslateProvider";

// ============================================================================
// INITIALIZE UI LANGUAGE
// ============================================================================

// Initialize the user's UI language before React renders.
setLanguage(getInitialLanguage());

// ============================================================================
// APPLICATION ROOT
// ============================================================================

const rootElement = document.getElementById("root");

if (!rootElement) {
throw new Error(
"Fockis application root element (#root) was not found.",
);
}

// ============================================================================
// RENDER APPLICATION
// ============================================================================
//
// Application hierarchy:
//
// BrowserRouter
// └── FockisTranslationProvider
// └── AutoTranslateProvider
// └── StripeProvider
// └── App
// └── All Fockis Pages
//
// AutoTranslateProvider is mounted ONCE here.
// Individual pages do not need to import it.
// ============================================================================

createRoot(rootElement).render(
<BrowserRouter>
<FockisTranslationProvider>
<AutoTranslateProvider enabled={true}>
<StripeProvider>
<App />
</StripeProvider>
</AutoTranslateProvider>
</FockisTranslationProvider>
</BrowserRouter>,
);