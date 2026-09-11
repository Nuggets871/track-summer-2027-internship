import { getProfile } from "@/lib/data/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import { CvImportPanel } from "@/components/profile/cv-import-panel";
import { ReferenceLetterPanel } from "@/components/profile/reference-letter-panel";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Ton profil</h1>
        <p className="text-sm text-muted-foreground">
          Utilisé pour calculer le Match Score de chaque offre et pour générer tes lettres de motivation — tenu à jour, il rend
          toute l&apos;application plus utile.
        </p>
      </div>
      <CvImportPanel profile={profile} />
      <ReferenceLetterPanel profile={profile} />
      {/* Keyed on updatedAt so applying a CV import (which changes profile
          server-side via a server action) remounts the form with fresh
          initial state instead of keeping stale useState values around. */}
      <ProfileForm key={profile.updatedAt.getTime()} profile={profile} />
    </div>
  );
}
