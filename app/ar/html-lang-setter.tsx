"use client";

import { useEffect } from "react";

export function HtmlLangSetter() {
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    return () => {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    };
  }, []);

  return null;
}
