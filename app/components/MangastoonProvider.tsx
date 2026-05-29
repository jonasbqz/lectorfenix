"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "../../utils/supabase/client";

const COOLDOWN_MS = 10 * 60 * 1000;
const LAST_SHOW_KEY = "mangastoon_last_ad_time";
const EXCLUDED_PATHS = ["/profile", "/premium", "/reset-password", "/auth"];
const SCRIPT_ID = "mangastoon-ad-external";

export default function MangastoonProvider() {
  const pathname = usePathname();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    async function checkMonetizationState() {
      if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
        setShouldLoad(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.is_premium) {
            setShouldLoad(false);
            return;
          }
        }
      } catch (error) {
        console.warn("[MangastoonProvider] Premium check bypassed:", error);
      }

      const lastAdTime = localStorage.getItem(LAST_SHOW_KEY);
      const now = Date.now();

      if (!lastAdTime || now - Number(lastAdTime) >= COOLDOWN_MS) {
        localStorage.setItem(LAST_SHOW_KEY, String(now));
        setShouldLoad(true);
      } else {
        setShouldLoad(false);
      }
    }

    checkMonetizationState();
  }, [pathname]);

  useEffect(() => {
    if (!shouldLoad || document.getElementById(SCRIPT_ID)) return;

    const externalScript = document.createElement("script");
    externalScript.src = "/api/v1/stats/tracker";
    externalScript.type = "text/javascript";
    externalScript.id = SCRIPT_ID;
    externalScript.async = true;
    externalScript.setAttribute("data-zone", "11014955");
    externalScript.setAttribute("data-cfasync", "false");
    externalScript.onerror = () => {
      console.warn("[MangastoonProvider] Failed to load external script.");
    };

    document.head.appendChild(externalScript);

    return () => {
      externalScript.remove();
    };
  }, [shouldLoad]);

  return null;
}
