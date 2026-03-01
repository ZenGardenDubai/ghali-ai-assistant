"use client";

import { useEffect } from "react";

export function HtmlLangSetter() {
  useEffect(() => {
    const prevLang = document.documentElement.lang;
    const prevDir = document.documentElement.dir;
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    return () => {
      document.documentElement.lang = prevLang;
      document.documentElement.dir = prevDir;
    };
  }, []);

  return null;
}
