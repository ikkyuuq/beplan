import "i18next";
import type en from "./locales/en";

// Typed keys: t("tabs.create") autocompletes and a wrong key fails tsc.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
