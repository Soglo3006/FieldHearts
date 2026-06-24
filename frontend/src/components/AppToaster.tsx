"use client";

import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";

/** Global toast notifications (top-right) with manual dismiss. */
export default function AppToaster() {
  const { t } = useTranslation();
  return (
    <Toaster
      richColors
      position="top-right"
      closeButton
      closeButtonAriaLabel={t("common.close")}
    />
  );
}
