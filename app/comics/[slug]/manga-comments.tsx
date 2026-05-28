"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../utils/supabase/client";
import CommentsSection from "../../components/CommentsSection";
import AuthModal from "../../components/AuthModal";

export default function MangaComments({ mangaId }: { mangaId: string }) {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentProfile, setCurrentProfile] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUser(user);

        const { data } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_premium")
          .eq("id", user.id)
          .maybeSingle();

        if (data) {
          setCurrentProfile(data);
        }
      } catch (err) {
        console.warn("[MangaComments] Error loading user for general comments:", err);
      }
    }
    loadUser();
  }, []);

  return (
    <>
      <CommentsSection
        mangaId={mangaId}
        currentUser={currentUser}
        currentProfile={currentProfile}
        onLoginRequired={() => setIsAuthModalOpen(true)}
      />
      {isAuthModalOpen && (
        <AuthModal
          open={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </>
  );
}
